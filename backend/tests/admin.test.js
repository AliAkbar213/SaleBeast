const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const adminRoute = require('../routes/admin/adminRoute');

async function setup(t, query) {
    const app = express();
    app.use(express.json());
    app.use(session({ secret: 'admin-test-secret', resave: false, saveUninitialized: false }));
    app.use('/api/admin', adminRoute({ query }));
    const server = app.listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    t.after(() => new Promise(resolve => server.close(resolve)));
    let cookie = '';
    return async (path = '', method = 'GET', body, withHeader = true) => {
        const response = await fetch(`http://127.0.0.1:${server.address().port}/api/admin${path}`, {
            method,
            headers: { 'Content-Type': 'application/json', ...(withHeader ? { 'X-Admin-Request': '1' } : {}), ...(cookie ? { Cookie: cookie } : {}) },
            ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        });
        if (response.headers.get('set-cookie')) cookie = response.headers.get('set-cookie').split(';')[0];
        return { status: response.status, body: await response.json() };
    };
}

test('admin endpoints reject unauthenticated access and writes without the custom header', async t => {
    const request = await setup(t, () => { throw new Error('Database should not be accessed'); });
    for (const [path, method, body] of [['', 'GET'], ['/orders', 'GET'], ['/orders/1', 'PATCH', { status: 'Delivered' }], ['/products', 'GET'], ['/products', 'POST', { name: 'New', price: '1' }], ['/categories', 'GET'], ['/products/1', 'PATCH', { name: 'X' }], ['/products/1', 'DELETE']]) {
        assert.equal((await request(path, method, body)).status, 401);
    }
    assert.equal((await request('/login', 'POST', { password: 'secret' }, false)).status, 403);
});

test('database password authenticates, plain text upgrades to bcrypt, logout revokes access', async t => {
    const calls = [];
    const request = await setup(t, async (sql, params) => {
        calls.push({ sql, params });
        return { rows: sql.startsWith('SELECT id, password') ? [{ id: '7', password: 'secret' }] : [] };
    });
    assert.equal((await request('/login', 'POST', { password: 'wrong' })).status, 401);
    assert.equal((await request('/login', 'POST', { password: 'secret' })).status, 200);
    const upgrade = calls.find(call => call.sql.startsWith('UPDATE public.admin'));
    assert.equal(await bcrypt.compare('secret', upgrade.params[0]), true);
    assert.equal((await request()).body.authenticated, true);
    assert.equal((await request('/products')).status, 200);
    assert.equal((await request('/logout', 'POST')).status, 200);
    assert.equal((await request('/products')).status, 401);
});

test('hashed passwords work; updates allow only product fields and preserve omitted media', async t => {
    const password = await bcrypt.hash('secret', 4);
    const calls = [];
    const request = await setup(t, async (sql, params) => {
        calls.push({ sql, params });
        if (sql.startsWith('SELECT id, password')) return { rows: [{ id: '7', password }] };
        if (sql.startsWith('UPDATE')) return { rows: [{ id: '1', name: 'Updated' }] };
        return { rows: [] };
    });
    await request('/login', 'POST', { password: 'secret' });
    for (const body of [{ image: 123 }, { images: 'not an array' }, { images: [123] }, { unknown_field: 'changed' }, { name: '' }, { price: -1 }, { stock: 1.5 }, { category_id: 'bad' }, {}]) {
        assert.equal((await request('/products/1', 'PATCH', body)).status, 400);
    }
    const result = await request('/products/1', 'PATCH', { name: "Updated'; DROP TABLE products; --", ar_desc: null, price: '2.500', stock: 0 });
    assert.equal(result.status, 200);
    const update = calls.find(call => call.sql.startsWith('UPDATE'));
    assert.ok(!update.sql.includes('DROP TABLE'));
    assert.ok(!update.sql.split(' RETURNING ')[0].includes('image'));
    assert.equal(update.params[0], "Updated'; DROP TABLE products; --");
    assert.equal(update.params[1], '2.500');
    assert.equal(update.params[2], 0);
    assert.equal(update.params[3], null);
    assert.equal((await request('/products/bad', 'DELETE')).status, 400);
    assert.equal((await request('/products/1', 'DELETE')).status, 404);
});

test('admin products return and update image strings and gallery arrays, including clearing them', async t => {
    const password = await bcrypt.hash('secret', 4);
    const product = { id: '1', image: '/images/main.png', images: ['/images/one.png', '/images/two.png'] };
    const calls = [];
    const request = await setup(t, async (sql, params) => {
        calls.push({ sql, params });
        if (sql.startsWith('SELECT id, password')) return { rows: [{ id: '7', password }] };
        return { rows: [product] };
    });
    await request('/login', 'POST', { password: 'secret' });
    const list = await request('/products');
    assert.deepEqual(list.body[0].images, product.images);
    assert.match(calls.at(-1).sql, /image, images FROM public.products/);
    assert.equal((await request('/products/1', 'PATCH', { image: product.image, images: product.images })).status, 200);
    assert.match(calls.at(-1).sql, /SET "image" = \$1, "images" = \$2/);
    assert.deepEqual(calls.at(-1).params, [product.image, product.images, '1']);
    assert.equal((await request('/products/1', 'PATCH', { image: null, images: null })).status, 200);
    assert.deepEqual(calls.at(-1).params, [null, null, '1']);
    assert.equal((await request('/products/1', 'PATCH', { images: [] })).status, 200);
    assert.deepEqual(calls.at(-1).params, [[], '1']);
});

test('foreign key failures produce clear messages for deletion and category changes', async t => {
    const request = await setup(t, async sql => {
        if (sql.startsWith('SELECT id, password')) return { rows: [{ id: '1', password: 'secret' }] };
        if (sql.startsWith('UPDATE public.admin')) return { rows: [] };
        throw Object.assign(new Error('Database details'), { code: '23503' });
    });
    await request('/login', 'POST', { password: 'secret' });
    assert.equal((await request('/products/1', 'DELETE')).status, 409);
    assert.equal((await request('/products/1', 'PATCH', { category_id: '2' })).status, 400);
    assert.equal((await request('/products', 'POST', { name: 'New', price: '1', category_id: '2' })).status, 400);
});

test('creating products validates required fields and inserts media with a generated ID', async t => {
    const password = await bcrypt.hash('secret', 4);
    const calls = [];
    const product = { id: '12', name: 'New product', price: '2.500', image: '/images/main.png', images: ['/images/one.png', '/images/two.png'] };
    const request = await setup(t, async (sql, params) => {
        calls.push({ sql, params });
        if (sql.startsWith('SELECT id, password')) return { rows: [{ id: '7', password }] };
        return { rows: [product] };
    });
    await request('/login', 'POST', { password: 'secret' });
    assert.equal((await request('/products', 'POST', { name: 'New', price: '1' }, false)).status, 403);
    for (const body of [{}, { name: 'New' }, { price: '1' }, { name: ' ', price: '1' }, { name: 'New', price: null }, { name: 'New', price: -1 }, { name: 'New', price: '1', stock: -1 }, { name: 'New', price: '1', id: '99' }]) {
        assert.equal((await request('/products', 'POST', body)).status, 400);
    }
    assert.ok(!calls.some(call => call.sql.startsWith('INSERT')));
    const { id, ...fields } = product;
    const created = await request('/products', 'POST', fields);
    assert.equal(created.status, 201);
    assert.deepEqual(created.body, product);
    assert.match(calls.at(-1).sql, /INSERT INTO public.products \("name", "price", "image", "images"\) VALUES \(\$1, \$2, \$3, \$4\)/);
    assert.deepEqual(calls.at(-1).params, [product.name, product.price, product.image, product.images]);
    assert.equal((await request('/products', 'POST', { name: 'Minimal', price: '0' })).status, 201);
    assert.match(calls.at(-1).sql, /\("name", "price"\) VALUES \(\$1, \$2\)/);
});

test('repeated password failures are rate limited', async t => {
    const request = await setup(t, async () => ({ rows: [] }));
    for (let attempt = 0; attempt < 10; attempt++) assert.equal((await request('/login', 'POST', { password: 'wrong' })).status, 401);
    assert.equal((await request('/login', 'POST', { password: 'wrong' })).status, 429);
});

test('admin orders list all users newest first and only permit validated status updates', async t => {
    const password = await bcrypt.hash('secret', 4);
    const orders = [
        { id: '2', user_id: '8', total: '12.500', status: 'Processing', created_at: '2026-11-06T00:00:00Z', area_id: '3', delivery_charge: '1.000' },
        { id: '1', user_id: null, total: null, status: null, created_at: '2026-11-05T00:00:00Z', area_id: null, delivery_charge: null },
    ];
    const calls = [];
    const request = await setup(t, async (sql, params) => {
        calls.push({ sql, params });
        if (sql.startsWith('SELECT id, password')) return { rows: [{ id: '7', password }] };
        if (sql.startsWith('UPDATE')) return { rows: [{ ...orders[0], status: params[0] }] };
        return { rows: orders };
    });
    await request('/login', 'POST', { password: 'secret' });
    assert.deepEqual((await request('/orders')).body, orders);
    assert.match(calls.at(-1).sql, /FROM public.orders ORDER BY created_at DESC, id DESC$/);
    assert.ok(!calls.at(-1).sql.includes('WHERE'));
    assert.equal((await request('/orders/2', 'PATCH', { status: 'Delivered' }, false)).status, 403);
    for (const body of [{}, { status: '' }, { status: ' ' }, { status: null }, { status: 1 }, { status: 'x'.repeat(101) }, { status: 'Delivered', total: '0' }, { user_id: '5' }]) {
        assert.equal((await request('/orders/2', 'PATCH', body)).status, 400);
    }
    for (const id of ['bad', '0', '9223372036854775808']) assert.equal((await request(`/orders/${id}`, 'PATCH', { status: 'Delivered' })).status, 400);
    assert.ok(!calls.some(call => call.sql.startsWith('UPDATE')));
    const updated = await request('/orders/2', 'PATCH', { status: '  Out for delivery  ' });
    assert.equal(updated.status, 200);
    assert.equal(updated.body.status, 'Out for delivery');
    assert.match(calls.at(-1).sql, /^UPDATE public.orders SET status = \$1 WHERE id = \$2 RETURNING/);
    assert.deepEqual(calls.at(-1).params, ['Out for delivery', '2']);
    assert.equal((await request('/orders/2', 'PATCH', { status: "Custom'; --" })).status, 200);
    assert.deepEqual(calls.at(-1).params, ["Custom'; --", '2']);
    assert.ok(!calls.at(-1).sql.includes("Custom'; --"));
});

test('admin orders handle empty lists, missing orders and database failures without leaking details', async t => {
    const password = await bcrypt.hash('secret', 4);
    let fail = false;
    const request = await setup(t, async sql => {
        if (sql.startsWith('SELECT id, password')) return { rows: [{ id: '7', password }] };
        if (fail) throw new Error('Private database details');
        return { rows: [] };
    });
    await request('/login', 'POST', { password: 'secret' });
    assert.deepEqual((await request('/orders')).body, []);
    assert.equal((await request('/orders/1', 'PATCH', { status: 'Delivered' })).status, 404);
    fail = true;
    for (const response of [await request('/orders'), await request('/orders/1', 'PATCH', { status: 'Delivered' })]) {
        assert.equal(response.status, 500);
        assert.ok(!response.body.err.includes('Private'));
    }
});
