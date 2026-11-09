const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const jwt = require('jsonwebtoken');
const adminRoute = require('../routes/admin/adminRoute');
const secret = 'test-only-stable-signing-secret';
async function start(t, tokenSecret = secret) {
    const app = express();
    app.use(express.json());
    app.use('/api/admin', adminRoute({ query: async sql => ({ rows: sql.startsWith('SELECT id, password') ? [{id: '1', password: 'secret'}] : [] }) }, { tokenSecret }));
    const server = app.listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    t.after(() => new Promise(resolve => server.close(resolve)));
    return async (path, token, body) => fetch(`http://127.0.0.1:${server.address().port}/api/admin${path}`, {
        method: body ? 'POST' : 'GET',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Request': '1', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        ...(body ? {body: JSON.stringify(body)} : {}),
    });
}
test('admin token works across independent instances without sessions or cookies', async t => {
    const first = await start(t), second = await start(t);
    const login = await first('/login', null, {password:'secret'});
    assert.equal(login.status, 200);
    assert.equal(login.headers.get('set-cookie'), null);
    const { token } = await login.json();
    for (const request of [first, second]) {
        for (const path of ['/', '/products', '/categories', '/orders']) assert.equal((await request(path, token)).status, 200);
    }
    const differentKey = await start(t, 'another-secret');
    assert.equal((await differentKey('/', token)).status, 401);
});
test('rejects missing, malformed, expired, wrong-role and tampered tokens', async t => {
    const request = await start(t);
    const sign = (payload, options = {}) => jwt.sign(payload, secret, {algorithm:'HS256',subject:'1',issuer:'salebeast',audience:'salebeast-admin',expiresIn:'2h',...options});
    const valid = sign({role:'admin'});
    for (const token of [null, 'invalid', valid.slice(0, -5)+'xxxxx', sign({role:'admin'}, {expiresIn:-1}), sign({role:'user'}), sign({role:'admin'}, {audience:'other'})]) {
        assert.equal((await request('/orders', token)).status, 401);
    }
});
test('missing signing secret fails closed', async t => {
    const request = await start(t, '');
    assert.equal((await request('/login', null, {password:'secret'})).status, 503);
    assert.equal((await request('/orders')).status, 401);
});
