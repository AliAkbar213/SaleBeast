function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    })[character]);
}

function orderInvoiceEmail(order, customer, items) {
    if (!items.length) throw new Error('Order items are unavailable for the invoice');
    const amount = value => {
        if (value === null || value === undefined || !Number.isFinite(Number(value)) || Number(value) < 0) {
            throw new Error('An invoice amount is unavailable');
        }
        return Math.round(Number(value) * 1000);
    };
    const money = fils => `${(fils / 1000).toFixed(3)} KD`;
    const lines = items.map(item => ({
        ...item, unitPrice: amount(item.purchase_price), lineTotal: amount(item.purchase_price) * item.quantity,
    }));
    const subtotal = lines.reduce((total, item) => total + item.lineTotal, 0);
    const delivery = amount(order.delivery_charge ?? 0);
    const total = amount(order.total);
    // Voucher amounts are not stored separately; use the saved order total.
    const discount = Math.max(0, subtotal + delivery - total);
    const totals = [['Subtotal', subtotal], ['Delivery charge', delivery],
        ...(discount > 0 ? [['Discount', discount]] : []), ['Total', total]];
    const orderDate = order.created_at ? new Date(order.created_at).toLocaleDateString('en-GB', { timeZone: 'Asia/Kuwait' }) : '';
    const details = [`Invoice #SB-${order.id}`, `Order #${order.id}`,
        ...(orderDate ? [`Order date: ${orderDate}`] : []),
        ...(customer.name ? [`Customer: ${customer.name}`] : []), `Email: ${customer.email.trim()}`];
    const introduction = `Your order #${order.id} has been delivered. Thank you for shopping with SalesBeast!`;
    return {
        text: [introduction, '', ...details, '', 'Product | Quantity | Unit price | Line total',
            ...lines.map(item => `${item.name} | ${item.quantity} | ${money(item.unitPrice)} | ${money(item.lineTotal)}`),
            '', ...totals.map(([label, value]) => `${label}: ${money(value)}`)].join('\n'),
        html: `<div style="font-family: Arial, sans-serif; max-width: 700px; margin: auto; color: #222;">
            <h1>SalesBeast</h1><p>${escapeHtml(introduction)}</p>
            <h2>${escapeHtml(details[0])}</h2>
            <p>${details.slice(1).map(escapeHtml).join('<br>')}</p>
            <table style="width: 100%; border-collapse: collapse;">
                <thead><tr style="background-color: #f5f5f5;">
                    <th style="padding: 10px; text-align: left;">Product</th>
                    <th style="padding: 10px; text-align: right;">Quantity</th>
                    <th style="padding: 10px; text-align: right;">Unit price</th>
                    <th style="padding: 10px; text-align: right;">Line total</th>
                </tr></thead>
                <tbody>${lines.map(item => `<tr>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;">${escapeHtml(item.name)}</td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;">${escapeHtml(item.quantity)}</td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;">${money(item.unitPrice)}</td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;">${money(item.lineTotal)}</td>
                </tr>`).join('')}</tbody>
            </table>
            <div style="text-align: right; margin-top: 20px;">${totals.map(([label, value]) =>
                `<p${label === 'Total' ? ' style="font-weight: bold;"' : ''}>${label}: ${money(value)}</p>`).join('')}</div>
        </div>`,
    };
}

module.exports = { orderInvoiceEmail };
