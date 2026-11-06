const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const adminRoute = require('../routes/admin/adminRoute');

async function setup(t, query, { sendEmail = async () => { throw new Error('Unexpected email send'); } } = {}) {
    const app = express();
    app.use(express.json());
    app.use(session({ secret: 'admin-test-secret', resave: false, saveUninitialized: false }));
    app.use('/api/admin', adminRoute({ query }, { sendEmail }));
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
    for (const body of [{}, { status: '' }, { status: ' ' }, { status: null }, { status: 1 }, { status: 'x'.repeat(101) }, { status: 'Delivered', total: '0' }, { user_id: '5' }, { status: 'Out for delivery' }, { status: "Custom'; --" }]) {
        assert.equal((await request('/orders/2', 'PATCH', body)).status, 400);
    }
    for (const id of ['bad', '0', '9223372036854775808']) assert.equal((await request(`/orders/${id}`, 'PATCH', { status: 'Delivered' })).status, 400);
    assert.ok(!calls.some(call => call.sql.startsWith('UPDATE')));
    const updated = await request('/orders/2', 'PATCH', { status: '  Processing  ' });
    assert.equal(updated.status, 200);
    assert.equal(updated.body.status, 'Processing');
    assert.match(calls.at(-1).sql, /^UPDATE public.orders SET status = \$1 WHERE id = \$2 AND status IS DISTINCT FROM \$1 RETURNING/);
    assert.deepEqual(calls.at(-1).params, ['Processing', '2']);
    for (const status of ['Processing', 'Cancelled']) assert.equal((await request('/orders/2', 'PATCH', { status })).status, 200);
});

async function setupOrderConfirmation(t, { email = 'customer@example.com', emailFailure, lookupFailure = false,
    itemLookupFailure = false, items = [
        { name: 'Cable <Pro> & "Plus"', quantity: 2, purchase_price: '8.125' },
        { name: 'Charger', quantity: 2, purchase_price: '3.500' },
    ],
} = {}) {
    const password = await bcrypt.hash('secret', 4);
    const emails = [];
    const lookups = [];
    const itemQueries = [];
    let order = { id: '42', user_id: '7', status: 'Processing', total: '22.000', delivery_charge: '2.000', created_at: '2026-11-07T12:00:00Z' };
    const request = await setup(t, async (sql, params) => {
        if (sql.startsWith('SELECT id, password')) return { rows: [{ id: '1', password }] };
        if (sql.startsWith('UPDATE public.orders')) {
            if (order.status === params[0]) return { rows: [] };
            order = { ...order, status: params[0] };
            return { rows: [order] };
        }
        if (sql.includes('FROM public.users')) {
            lookups.push(params);
            if (lookupFailure) throw new Error('Private database error');
            return { rows: email === null ? [] : [{ name: 'Customer <Name>', email }] };
        }
        if (sql.includes('FROM public.order_items')) {
            itemQueries.push({ sql, params });
            if (itemLookupFailure) throw new Error('Private item lookup error');
            return { rows: items };
        }
        if (sql.includes('FROM public.orders WHERE id')) return { rows: [order] };
        throw new Error(`Unexpected query: ${sql}`);
    }, { sendEmail: async message => {
        emails.push(message);
        assert.ok(['Confirmed', 'Delivered'].includes(order.status), 'Save the status before sending');
        if (emailFailure === 'throw') throw new Error('Provider unavailable');
        return emailFailure === 'error' ? { error: { message: 'Provider rejected' } } : { data: { id: 'test-only' } };
    } });
    await request('/login', 'POST', { password: 'secret' });
    return { request, emails, lookups, itemQueries };
}

test('changing to Confirmed emails the stored customer and repeated or concurrent saves do not resend', async t => {
    const { request, emails, lookups } = await setupOrderConfirmation(t);
    const results = await Promise.all([
        request('/orders/42', 'PATCH', { status: 'Confirmed' }),
        request('/orders/42', 'PATCH', { status: 'Confirmed' }),
    ]);
    assert.ok(results.every(result => result.status === 200 && result.body.status === 'Confirmed'));
    assert.equal(results.filter(result => result.body.confirmation_email === 'sent').length, 1);
    assert.equal(emails.length, 1);
    assert.deepEqual(lookups, [['7']]);
    assert.equal(emails[0].to, 'customer@example.com');
    assert.equal(emails[0].from, 'SalesBeast <orders@salebeastkw.com>');
    assert.match(emails[0].subject, /order #42 is confirmed/);
    assert.match(emails[0].text, /order #42 has been confirmed/);
    assert.equal(emails[0].attachments, undefined);
    await request('/orders/42', 'PATCH', { status: 'Confirmed' });
    assert.equal(emails.length, 1);
});

test('other dropdown statuses do not send confirmation emails', async t => {
    const { request, emails } = await setupOrderConfirmation(t);
    for (const status of ['Cancelled', 'Processing']) {
        const result = await request('/orders/42', 'PATCH', { status });
        assert.equal(result.status, 200);
        assert.equal(result.body.status, status);
        assert.equal(result.body.confirmation_email, undefined);
    }
    assert.equal(emails.length, 0);
});

test('Delivered includes an invoice in the email and repeated or concurrent saves do not resend', async t => {
    const { request, emails, lookups, itemQueries } = await setupOrderConfirmation(t);
    await request('/orders/42', 'PATCH', { status: 'Confirmed' });
    const results = await Promise.all([
        request('/orders/42', 'PATCH', { status: 'Delivered' }),
        request('/orders/42', 'PATCH', { status: 'Delivered' }),
    ]);
    assert.ok(results.every(result => result.status === 200 && result.body.status === 'Delivered'));
    assert.equal(results.filter(result => result.body.confirmation_email === 'sent').length, 1);
    assert.equal(emails.length, 2);
    assert.deepEqual(lookups, [['7'], ['7']]);
    assert.equal(emails[1].to, 'customer@example.com');
    assert.equal(emails[1].from, 'SalesBeast <orders@salebeastkw.com>');
    assert.match(emails[1].subject, /order #42 has been delivered/);
    assert.match(emails[1].text, /order #42 has been delivered/);
    assert.equal(emails[1].attachments, undefined);
    assert.match(emails[1].html, /Invoice #SB-42/);
    assert.match(emails[1].html, /Customer &lt;Name&gt;/);
    assert.match(emails[1].html, /Order date: 07\/11\/2026/);
    const rows = Array.from(emails[1].html.matchAll(/<tr>([\s\S]*?)<\/tr>/g), match => match[1]);
    assert.equal(rows.length, 2);
    assert.match(rows[0], /Cable &lt;Pro&gt; &amp; &quot;Plus&quot;/);
    assert.match(rows[0], />2<\/td>/);
    assert.match(rows[0], /8\.125 KD/);
    assert.match(rows[0], /16\.250 KD/);
    assert.match(rows[1], /Charger/);
    assert.match(rows[1], /3\.500 KD/);
    assert.match(rows[1], /7\.000 KD/);
    for (const part of ['Subtotal: 23.250 KD', 'Delivery charge: 2.000 KD', 'Discount: 3.250 KD', 'Total: 22.000 KD']) {
        assert.ok(emails[1].html.includes(part));
        assert.ok(emails[1].text.includes(part));
    }
    assert.match(emails[1].text, /Cable <Pro> & "Plus" \| 2 \| 8\.125 KD \| 16\.250 KD/);
    assert.equal(itemQueries.length, 1);
    assert.deepEqual(itemQueries[0].params, ['42']);
    assert.match(itemQueries[0].sql, /oi.purchase_price/);
    assert.doesNotMatch(itemQueries[0].sql, /p\.price/);
    await request('/orders/42', 'PATCH', { status: 'Delivered' });
    assert.equal(emails.length, 2);
});

test('invoice item lookup failures or empty orders show an email warning while Delivered stays saved', async t => {
    for (const options of [{ itemLookupFailure: true }, { items: [] }]) {
        const { request, emails } = await setupOrderConfirmation(t, options);
        const result = await request('/orders/42', 'PATCH', { status: 'Delivered' });
        assert.equal(result.status, 200);
        assert.equal(result.body.status, 'Delivered');
        assert.equal(result.body.confirmation_email, 'failed');
        assert.equal(emails.length, 0);
    }
});

for (const status of ['Confirmed', 'Delivered']) {
test(`email failures or unavailable customer email return a warning while keeping ${status} saved`, async t => {
    for (const options of [{ emailFailure: 'throw' }, { emailFailure: 'error' }, { lookupFailure: true }, { email: null }, { email: ' ' }]) {
        await t.test(JSON.stringify(options), async t => {
            const { request, emails } = await setupOrderConfirmation(t, options);
            const result = await request('/orders/42', 'PATCH', { status });
            assert.equal(result.status, 200);
            assert.equal(result.body.status, status);
            assert.equal(result.body.confirmation_email, 'failed');
            assert.ok(!JSON.stringify(result.body).includes('Private database error'));
            assert.equal((await request('/orders/42', 'PATCH', { status })).body.status, status);
            assert.equal(emails.length, options.emailFailure ? 1 : 0);
        });
    }
});
}

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
