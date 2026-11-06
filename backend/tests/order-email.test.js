const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const vm = require('node:vm');
const { addressEmailHtml } = require('../routes/order/orderAddress');

async function placeOrder({ adminFailure, customerFailure, lookupFailure, email = 'customer@example.com', validArea = true } = {}) {
    const emails = [];
    const queries = [];
    const query = async (sql, values) => {
        queries.push({ sql, values });
        if (sql.includes('FROM products')) return { rows: [values[0] === 1
            ? { id: 1, name: 'Cable <Pro> & "Plus"', price: '10.000', discounted_price: '8.125' }
            : { id: 2, name: 'Charger', price: '3.500' }] };
        if (sql.includes('FROM area')) return { rows: validArea ? [{ delivery_charge: '2.000' }] : [] };
        if (sql.includes('INSERT INTO orders')) return { rows: [{ id: 42 }] };
        if (sql.includes('FROM public.users')) {
            if (lookupFailure) throw new Error('Lookup unavailable');
            return { rows: email === null ? [] : [{ email }] };
        }
        return { rows: [] };
    };
    const module = { exports: {} };
    vm.runInNewContext(readFileSync(path.join(__dirname, '../routes/order/orderController.js'), 'utf8'), {
        module, process: { env: {} }, console: { log() {}, error() {} },
        require(name) {
            if (name === '../../dbConnection') return { query, connect: async () => ({ query, release() {} }) };
            if (name === './orderAddress') return { addressEmailHtml };
            if (name === 'resend') return { Resend: class { emails = { send: async message => {
                assert.ok(queries.some(({ sql }) => sql === 'COMMIT'));
                emails.push(message);
                const failure = message.to === 'aliakbarbhura@gmail.com' ? adminFailure : customerFailure;
                if (failure === 'throw') throw new Error('Email unavailable');
                return failure === 'error' ? { error: { message: 'Rejected' } } : {};
            } }; } };
            throw new Error(`Unexpected dependency: ${name}`);
        },
    });
    const response = { code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
    await module.exports.PlaceOrder({ body: {
        user_id: 7, email: 'untrusted@example.com', area_id: 1,
        cart_arr: [{ item_id: 1, quantity: 2 }, { item_id: 2, quantity: 3 }],
        address: { governorate: 'Capital', area: 'City', block: '1', street: '5', mobile: '12345678' },
    } }, response);
    return { emails, queries, response };
}

test('customer confirmation uses the stored email and lists products, quantities, actual prices and totals', async () => {
    const c = await placeOrder();
    assert.equal(c.response.code, 201);
    assert.equal(c.emails.length, 2);
    assert.equal(c.emails[0].to, 'aliakbarbhura@gmail.com');
    assert.equal(c.emails[1].to, 'customer@example.com');
    assert.match(c.emails[1].subject, /order #42 has been placed/);
    const html = c.emails[1].html;
    assert.match(html, /Your order has been placed successfully/);
    assert.match(html, /Quantity/);
    assert.match(html, /Unit Price/);
    const rows = Array.from(html.matchAll(/<tr>([\s\S]*?)<\/tr>/g), match => match[1]);
    assert.equal(rows.length, 2);
    assert.match(rows[0], /Cable &lt;Pro&gt; &amp; &quot;Plus&quot;/);
    assert.match(rows[0], />\s*2\s*<\/td>/);
    assert.match(rows[0], /8\.125 KD/);
    assert.match(rows[0], /16\.250 KD/);
    assert.match(rows[1], /Charger/);
    assert.match(rows[1], />\s*3\s*<\/td>/);
    assert.match(rows[1], /3\.500 KD/);
    assert.match(rows[1], /10\.500 KD/);
    assert.match(html, /Total: 28\.750 KD/);
    assert.deepEqual(Array.from(c.queries.find(({ sql }) => sql.includes('FROM public.users')).values), [7]);
});

test('customer confirmation is still sent if the work email fails', async () => {
    for (const adminFailure of ['throw', 'error']) {
        const c = await placeOrder({ adminFailure });
        assert.equal(c.response.code, 201);
        assert.equal(c.emails[1].to, 'customer@example.com');
        assert.match(c.emails[1].html, /Ordered Products/);
    }
});

test('customer email or lookup failures leave the saved order successful', async () => {
    for (const options of [{ customerFailure: 'throw' }, { customerFailure: 'error' }, { lookupFailure: true }, { email: null }, { email: ' ' }]) {
        const c = await placeOrder(options);
        assert.equal(c.response.code, 201);
        assert.ok(!c.queries.some(({ sql }) => sql === 'ROLLBACK'));
        if (options.lookupFailure || options.email !== undefined) assert.equal(c.emails.length, 1);
    }
});

test('failed orders do not send work or customer emails', async () => {
    const c = await placeOrder({ validArea: false });
    assert.equal(c.response.code, 404);
    assert.equal(c.emails.length, 0);
});
