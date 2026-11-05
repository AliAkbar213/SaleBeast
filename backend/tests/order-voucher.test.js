const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");
const vm = require("node:vm");
const { addressEmailHtml } = require("../routes/order/orderAddress");

function context({ voucher = { code: "SAVE", amount: "3.125" }, failLookup = false } = {}) {
    const queries = [];
    const emails = [];
    let released = false;
    const query = async (sql, values) => {
        queries.push({ sql, values });
        if (sql.includes("FROM public.vouchers")) {
            if (failLookup) throw new Error("Database unavailable");
            return { rows: voucher && values[0] === voucher.code ? [voucher] : [] };
        }
        if (sql.includes("FROM products")) return { rows: [{ id: 1, name: "Product", price: "10.000", discounted_price: "8.500" }] };
        if (sql.includes("FROM area")) return { rows: [{ delivery_charge: "2.000" }] };
        if (sql.includes("INSERT INTO orders")) return { rows: [{ id: 42 }] };
        return { rows: [] };
    };
    const module = { exports: {} };
    vm.runInNewContext(readFileSync(path.join(__dirname, "../routes/order/orderController.js"), "utf8"), {
        module, process: { env: {} }, console: { log() {}, error() {} },
        require(name) {
            if (name === "../../dbConnection") return { query, connect: async () => ({ query, release() { released = true; } }) };
            if (name === "./orderAddress") return { addressEmailHtml };
            if (name === "resend") return { Resend: class { emails = { send: async (email) => { emails.push(email); return {}; } }; } };
            throw new Error(`Unexpected dependency: ${name}`);
        },
    });
    return {
        ...module.exports, queries, emails, released: () => released,
        response: { code: 200, body: null, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } },
    };
}

const order = {
    user_id: 1, area_id: 1, cart_arr: [{ item_id: 1, quantity: 2 }],
    address: { governorate: "Capital", area: "City", block: "1", street: "5", mobile: "12345678" },
};

test("voucher lookup trims surrounding spaces and returns the fixed database amount", async () => {
    const c = context();
    await c.ValidateVoucher({ body: { code: " SAVE " } }, c.response);
    assert.equal(c.response.code, 200);
    assert.equal(c.response.body.code, "SAVE");
    assert.equal(c.response.body.amount, 3.125);
    assert.deepEqual(Array.from(c.queries[0].values), ["SAVE"]);
});

test("missing, unknown, and malformed codes are rejected", async () => {
    for (const code of [undefined, null, "", "  ", 42, {}, "UNKNOWN", "' OR 1=1 --"]) {
        const c = context();
        await c.ValidateVoucher({ body: { code } }, c.response);
        assert.equal(c.response.code, 400);
    }
});

test("null and invalid stored amounts cannot apply a discount; zero is accepted", async () => {
    for (const amount of [null, "-1", "NaN", "Infinity"]) {
        const c = context({ voucher: { code: "SAVE", amount } });
        await c.ValidateVoucher({ body: { code: "SAVE" } }, c.response);
        assert.equal(c.response.code, 400);
    }
    const c = context({ voucher: { code: "SAVE", amount: "0" } });
    await c.ValidateVoucher({ body: { code: "SAVE" } }, c.response);
    assert.equal(c.response.body.amount, 0);
});

test("order uses database voucher amount with product discounts, quantities and delivery", async () => {
    const c = context();
    await c.PlaceOrder({ body: { ...order, voucher_code: "SAVE", voucher_amount: 999 } }, c.response);
    assert.equal(c.response.code, 201);
    const insert = c.queries.find(({ sql }) => sql.includes("INSERT INTO orders"));
    assert.equal(insert.values[1], 15.875);
    assert.match(c.emails[0].html, /Voucher discount: 3\.125 KD/);
    assert.match(c.emails[0].html, /Total: 15\.875 KD/);
    assert.ok(c.released());
});

test("voucher larger than total produces a zero total, including delivery", async () => {
    const c = context({ voucher: { code: "SAVE", amount: "100" } });
    await c.PlaceOrder({ body: { ...order, voucher_code: "SAVE" } }, c.response);
    assert.equal(c.response.code, 201);
    assert.equal(c.queries.find(({ sql }) => sql.includes("INSERT INTO orders")).values[1], 0);
    assert.match(c.emails[0].html, /Voucher discount: 19\.000 KD/);
});

test("deleted or invalid vouchers roll back without creating an order", async () => {
    const c = context({ voucher: null });
    await c.PlaceOrder({ body: { ...order, voucher_code: "SAVE" } }, c.response);
    assert.equal(c.response.code, 400);
    assert.ok(c.queries.some(({ sql }) => sql === "ROLLBACK"));
    assert.ok(!c.queries.some(({ sql }) => sql.includes("INSERT INTO orders")));
    assert.equal(c.emails.length, 0);
    assert.ok(c.released());
});

test("orders without a voucher retain their original total", async () => {
    const c = context();
    await c.PlaceOrder({ body: order }, c.response);
    assert.equal(c.response.code, 201);
    assert.equal(c.queries.find(({ sql }) => sql.includes("INSERT INTO orders")).values[1], 19);
    assert.ok(!c.queries.some(({ sql }) => sql.includes("FROM public.vouchers")));
    assert.ok(!c.emails[0].html.includes("Voucher discount"));
});

test("database lookup failures return an error and prevent order creation", async () => {
    const c = context({ failLookup: true });
    await c.ValidateVoucher({ body: { code: "SAVE" } }, c.response);
    assert.equal(c.response.code, 500);
    await c.PlaceOrder({ body: { ...order, voucher_code: "SAVE" } }, c.response);
    assert.equal(c.response.code, 500);
    assert.ok(!c.queries.some(({ sql }) => sql.includes("INSERT INTO orders")));
    assert.ok(c.released());
});
