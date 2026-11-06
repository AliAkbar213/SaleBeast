const { test } = require('node:test');
const assert = require('node:assert/strict');
const { orderInvoiceEmail } = require('../routes/order/orderInvoiceEmail');

test('invoice handles fractional prices without adding a discount when the saved total matches', () => {
    const invoice = orderInvoiceEmail({ id: '1', total: '0.903', delivery_charge: '0.300' },
        { email: 'customer@example.com' }, [{ name: 'Product', quantity: 3, purchase_price: '0.201' }]);
    assert.match(invoice.text, /Subtotal: 0\.603 KD/);
    assert.match(invoice.text, /Total: 0\.903 KD/);
    assert.doesNotMatch(invoice.text, /Discount:/);
    assert.doesNotMatch(invoice.html, /Discount:/);
});

test('fully discounted orders show zero total and do not claim payment was received', () => {
    const invoice = orderInvoiceEmail({ id: '1', total: '0.000', delivery_charge: '2.000' },
        { email: 'customer@example.com' }, [{ name: 'Product', quantity: 1, purchase_price: '10.000' }]);
    assert.match(invoice.text, /Discount: 12\.000 KD/);
    assert.match(invoice.text, /Total: 0\.000 KD/);
    assert.doesNotMatch(invoice.text, /paid|payment received/i);
});
