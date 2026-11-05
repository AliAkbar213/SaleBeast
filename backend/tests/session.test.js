const assert = require("node:assert/strict");
const { test } = require("node:test");
const express = require("express");
const session = require("express-session");
const sessionOptions = require("../sessionOptions");

test("local HTTP sessions issue a cookie that authenticates subsequent requests", async (t) => {
    const app = express();
    app.use(session(sessionOptions({})));
    app.post("/login", (req, res) => {
        req.session.user = { id: "42" };
        res.json({ ok: true });
    });
    app.get("/orders", (req, res) => {
        if (!req.session.user) return res.sendStatus(401);
        res.json({ userId: req.session.user.id });
    });
    const server = app.listen(0, "127.0.0.1");
    await new Promise((resolve) => server.once("listening", resolve));
    t.after(() => new Promise((resolve) => server.close(resolve)));
    const url = `http://127.0.0.1:${server.address().port}`;
    const login = await fetch(`${url}/login`, { method: "POST" });
    const cookie = login.headers.get("set-cookie");
    assert.ok(cookie, "Login must issue a session cookie over local HTTP");
    assert.match(cookie, /SameSite=Lax/);
    assert.doesNotMatch(cookie, /; Secure/i);
    const orders = await fetch(`${url}/orders`, { headers: { Cookie: cookie.split(";")[0] } });
    assert.equal(orders.status, 200);
    assert.deepEqual(await orders.json(), { userId: "42" });
    const anonymous = await fetch(`${url}/orders`);
    assert.equal(anonymous.status, 401);
});

test("production and Render keep secure cross-site session cookies", () => {
    for (const env of [{ NODE_ENV: "production" }, { RENDER: "true" }]) {
        const options = sessionOptions({ ...env, SESSION_SECRET: "test-session-secret" });
        assert.equal(options.cookie.secure, true);
        assert.equal(options.cookie.sameSite, "none");
        assert.equal(options.cookie.httpOnly, true);
        assert.equal(options.secret, "test-session-secret");
    }
});
