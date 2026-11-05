const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");
const vm = require("node:vm");

function setup(query) {
    const module = { exports: {} };
    vm.runInNewContext(readFileSync(path.join(__dirname, "../routes/order/orderController.js"), "utf8"), {
        module, process: { env: {} }, console: { error() {} },
        require(name) {
            if (name === "../../dbConnection") return { query };
            if (name === "./orderAddress") return {};
            if (name === "resend") return { Resend: class {} };
            throw new Error(`Unexpected dependency: ${name}`);
        },
    });
    const response = { code: 200, body: null, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
    return { getOrders: module.exports.GetOrders, response };
}

test("order history requires a signed-in user before querying the database", async () => {
    for (const session of [undefined, {}, { user: {} }]) {
        const { getOrders, response } = setup(() => assert.fail("Unexpected database query"));
        await getOrders({ session, query: { user_id: "42" } }, response);
        assert.equal(response.code, 401);
    }
});

test("order history uses the session ID, ignores supplied IDs, and sorts newest first", async () => {
    const orders = [{ id: "9", total: "12.500", status: null, delivery_charge: "1.000" }];
    const { getOrders, response } = setup(async (sql, values) => {
        assert.match(sql, /FROM public\.orders WHERE user_id = \$1/);
        assert.match(sql, /ORDER BY created_at DESC, id DESC/);
        assert.equal(values.length, 1);
        assert.equal(values[0], "9007199254740993");
        return { rows: orders };
    });
    await getOrders({ session: { user: { id: "9007199254740993" } }, query: { user_id: "2" }, body: { user_id: "3" } }, response);
    assert.equal(response.code, 200);
    assert.deepEqual(response.body, orders);
});

test("a customer with no orders receives an empty list", async () => {
    const { getOrders, response } = setup(async () => ({ rows: [] }));
    await getOrders({ session: { user: { id: "1" } } }, response);
    assert.equal(response.code, 200);
    assert.equal(response.body.length, 0);
});

test("database failures return an error status without exposing database details", async () => {
    const { getOrders, response } = setup(async () => { throw new Error("private database details"); });
    await getOrders({ session: { user: { id: "1" } } }, response);
    assert.equal(response.code, 500);
    assert.equal(response.body.err, "Unable to load your orders. Please try again.");
});
