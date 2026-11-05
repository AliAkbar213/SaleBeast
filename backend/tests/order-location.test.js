const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");
const vm = require("node:vm");
const { addressEmailHtml } = require("../routes/order/orderAddress");

const address = { governorate: "Capital", area: "Kuwait City", block: "1", street: "Street 5", mobile: "12345678", notes: 'Entrance <A> & "B"' };

function controllerContext() {
    const emails = [];
    const queries = [];
    const query = async (sql) => {
        queries.push(sql);
        if (sql.includes("FROM products")) return { rows: [{ id: 1, name: "Projector", price: 10 }] };
        if (sql.includes("FROM area")) return { rows: [{ delivery_charge: 2 }] };
        if (sql.includes("INSERT INTO orders")) return { rows: [{ id: 42 }] };
        return { rows: [] };
    };
    const module = { exports: {} };
    vm.runInNewContext(readFileSync(path.join(__dirname, "../routes/order/orderController.js"), "utf8"), {
        module, process: { env: {} }, console: { log() {}, error() {} },
        require(name) {
            if (name === "../../dbConnection") return { query, connect: async () => ({ query, release() {} }) };
            if (name === "./orderAddress") return { addressEmailHtml };
            if (name === "resend") return { Resend: class { emails = { send: async (email) => { emails.push(email); return { data: { id: "test" } }; } }; } };
            throw new Error(`Unexpected dependency: ${name}`);
        },
    });
    const response = { code: 200, body: null, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
    return { place: module.exports.PlaceOrder, emails, queries, response };
}

test("order email includes the selected pin, a usable Maps link, and all escaped address fields", async () => {
    const context = controllerContext();
    await context.place({ body: {
        user_id: 1, area_id: 1, cart_arr: [{ item_id: 1, quantity: 2 }],
        address: { ...address, location: { latitude: 29.3759, longitude: 47.9774 } },
    } }, context.response);
    assert.equal(context.response.code, 201);
    assert.equal(context.emails.length, 1);
    const email = context.emails[0];
    assert.equal(email.to, "salebeast.kw@gmail.com");
    assert.match(email.html, /29\.3759,47\.9774/);
    assert.match(email.html, /https:\/\/www.google.com\/maps\/search\/\?api=1&amp;query=29\.3759%2C47\.9774/);
    for (const value of ["Capital", "Kuwait City", "Street 5", "12345678", "Entrance &lt;A&gt; &amp; &quot;B&quot;"]) assert.ok(email.html.includes(value));
    assert.match(email.html, /Total: 22\.000 KD/);
});

test("checkout still accepts orders without a map location", async () => {
    for (const location of [undefined, null]) {
        const context = controllerContext();
        await context.place({ body: { user_id: 1, area_id: 1, cart_arr: [{ item_id: 1, quantity: 1 }], address: { ...address, location } } }, context.response);
        assert.equal(context.response.code, 201);
        assert.equal(context.emails.length, 1);
        assert.ok(!context.emails[0].html.includes("maps/search"));
    }
});

test("invalid map coordinates are rejected before creating an order or sending mail", async () => {
    for (const location of [{ latitude: 91, longitude: 48 }, { latitude: 29, longitude: -181 },
        { latitude: "29", longitude: 48 }, { latitude: null, longitude: 48 }, {}, "bad",
        { latitude: NaN, longitude: 48 }, { latitude: 29, longitude: Infinity }]) {
        const context = controllerContext();
        await context.place({ body: { address: { ...address, location } } }, context.response);
        assert.equal(context.response.code, 400);
        assert.equal(context.queries.length, 0);
        assert.equal(context.emails.length, 0);
    }
    assert.match(addressEmailHtml({ ...address, location: { latitude: 0, longitude: 0 } }), /query=0%2C0/);
});
