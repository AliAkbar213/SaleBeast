const express = require('express');
const { z } = require('zod');
const { Resend } = require('resend');
const { orderInvoiceEmail } = require('../order/orderInvoiceEmail');

const idSchema = z.string().max(19).refine(value => /^[1-9]\d*$/.test(value) && BigInt(value) <= 9223372036854775807n);
const money = z.union([z.string().regex(/^\d+(\.\d+)?$/), z.number().finite().nonnegative()]);
const productFields = z.object({
    name: z.string().trim().min(1).max(1000),
    price: money,
    desc: z.string().nullable(),
    stock: z.number().int().min(0).max(2147483647).nullable(),
    category_id: idSchema.nullable(),
    key_features: z.string().nullable(),
    discounted_price: money.nullable(),
    ar_desc: z.string().nullable(),
    ar_key_features: z.string().nullable(),
    video: z.string().nullable(),
    ar_name: z.string().nullable(),
    image: z.string().nullable(),
    images: z.array(z.string()).nullable(),
});
const productSchema = productFields.partial().strict().refine(value => Object.keys(value).length > 0, 'No fields to update');
const createProductSchema = productFields.partial().required({ name: true, price: true }).strict();
const columns = 'id, name, price, "desc", stock, category_id, key_features, discounted_price, ar_desc, ar_key_features, video, ar_name, image, images';
const orderColumns = 'id, user_id, total, status, created_at, area_id, delivery_charge';
const orderStatusSchema = z.object({
    status: z.string().trim().pipe(z.enum(['Processing', 'Confirmed', 'Delivered', 'Cancelled'])),
}).strict();

module.exports = function adminRoute(pool = require('../../dbConnection'), {
    sendEmail = message => new Resend(process.env.RESEND_API_KEY).emails.send(message),
} = {}) {
    const router = express.Router();
    const attempts = new Map();
    router.use((req, res, next) => {
        res.set('Cache-Control', 'no-store');
        // A custom header requires a successful CORS preflight for cross-site writes.
        if (!['GET', 'HEAD'].includes(req.method) && req.get('X-Admin-Request') !== '1') {
            return res.status(403).json({ err: 'Invalid admin request' });
        }
        next();
    });

    router.post('/login', async (req, res) => {
        const now = Date.now();
        for (const [ip, entry] of attempts) if (entry.expires <= now) attempts.delete(ip);
        const entry = attempts.get(req.ip) || { count: 0, expires: now + 15 * 60 * 1000 };
        if (entry.count >= 10) {
            res.set('Retry-After', String(Math.ceil((entry.expires - now) / 1000)));
            return res.status(429).json({ err: 'Too many attempts. Try again in 15 minutes.' });
        }
        entry.count++;
        attempts.set(req.ip, entry);
        const password = req.body?.password;
        if (typeof password !== 'string' || !password.length || Buffer.byteLength(password) > 72) {
            return res.status(400).json({ err: 'Enter a password of at most 72 bytes.' });
        }
        try {
            const { rows } = await pool.query('SELECT id, password FROM public.admin WHERE password IS NOT NULL ORDER BY id');
            const admin = rows.find(row => row.password === password);
            if (!admin) return res.status(401).json({ err: 'Incorrect admin password.' });
            const user = req.session.user;
            req.session.regenerate(err => {
                if (err) return res.status(500).json({ err: 'Unable to start admin session.' });
                if (user) req.session.user = user;
                req.session.admin = { id: admin.id, expires: Date.now() + 2 * 60 * 60 * 1000 };
                req.session.save(err => {
                    if (err) return res.status(500).json({ err: 'Unable to save admin session.' });
                    attempts.delete(req.ip);
                    res.json({ authenticated: true });
                });
            });
        } catch {
            res.status(500).json({ err: 'Unable to check admin password.' });
        }
    });

    router.use((req, res, next) => {
        if (!req.session.admin || req.session.admin.expires <= Date.now()) {
            delete req.session.admin;
            return res.status(401).json({ err: 'Please enter the admin password to continue.' });
        }
        next();
    });
    router.get('/', (req, res) => res.json({ authenticated: true }));
    router.post('/logout', (req, res) => {
        delete req.session.admin;
        req.session.save(err => err
            ? res.status(500).json({ err: 'Unable to log out.' })
            : res.json({ authenticated: false }));
    });
    router.get('/orders', async (req, res) => {
        try {
            const { rows } = await pool.query(`SELECT ${orderColumns} FROM public.orders ORDER BY created_at DESC, id DESC`);
            res.json(rows);
        } catch { res.status(500).json({ err: 'Unable to load orders.' }); }
    });
    router.patch('/orders/:id', async (req, res) => {
        const parsed = orderStatusSchema.safeParse(req.body);
        if (!idSchema.safeParse(req.params.id).success || !parsed.success) {
            return res.status(400).json({ err: 'Choose Processing, Confirmed, Delivered, or Cancelled and a valid order ID.' });
        }
        try {
            const { rows } = await pool.query(
                `UPDATE public.orders SET status = $1 WHERE id = $2 AND status IS DISTINCT FROM $1 RETURNING ${orderColumns}`,
                [parsed.data.status, req.params.id],
            );
            if (!rows.length) {
                // Repeated or concurrent saves of the same status must not send another email.
                const existing = await pool.query(`SELECT ${orderColumns} FROM public.orders WHERE id = $1`, [req.params.id]);
                if (!existing.rows.length) return res.status(404).json({ err: 'Order no longer exists.' });
                return res.json(existing.rows[0]);
            }
            const order = rows[0];
            if (['Confirmed', 'Delivered'].includes(order.status)) {
                // The status has already been saved. Email failures must not undo it.
                try {
                    const { rows: users } = await pool.query('SELECT name, email FROM public.users WHERE id = $1', [order.user_id]);
                    const customerEmail = users[0]?.email?.trim();
                    if (!customerEmail) throw new Error('Customer email is unavailable');
                    let invoice = {};
                    if (order.status === 'Delivered') {
                        const { rows: items } = await pool.query(`
                            SELECT COALESCE(p.name, 'Product #' || oi.product_id::text) AS name,
                                oi.quantity, oi.purchase_price
                            FROM public.order_items oi
                            LEFT JOIN public.products p ON p.id = oi.product_id
                            WHERE oi.order_id = $1 ORDER BY oi.id`, [order.id]);
                        invoice = orderInvoiceEmail(order, users[0], items);
                    }
                    const { error } = await sendEmail({
                        from: 'SalesBeast <orders@salebeastkw.com>',
                        to: customerEmail,
                        subject: order.status === 'Delivered'
                            ? `Your SalesBeast order #${order.id} has been delivered - invoice included`
                            : `Your SalesBeast order #${order.id} is confirmed`,
                        text: `Your order #${order.id} has been ${order.status === 'Delivered' ? 'delivered' : 'confirmed'}. Thank you for shopping with SalesBeast!`,
                        ...invoice,
                    });
                    if (error) throw new Error(error.message || 'Email provider rejected the confirmation');
                    return res.json({ ...order, confirmation_email: 'sent' });
                } catch (error) {
                    console.error('Failed to send order status confirmation:', error.message);
                    return res.json({ ...order, confirmation_email: 'failed' });
                }
            }
            res.json(order);
        } catch { res.status(500).json({ err: 'Unable to update order status.' }); }
    });
    router.get('/products', async (req, res) => {
        try {
            const { rows } = await pool.query(`SELECT ${columns} FROM public.products ORDER BY id`);
            res.json(rows);
        } catch { res.status(500).json({ err: 'Unable to load products.' }); }
    });
    router.get('/categories', async (req, res) => {
        try {
            const { rows } = await pool.query('SELECT id, name FROM public.categories ORDER BY name');
            res.json(rows);
        } catch { res.status(500).json({ err: 'Unable to load categories.' }); }
    });
    router.post('/products', async (req, res) => {
        const parsed = createProductSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ err: 'Enter a product name and price, and check that prices and stock are not negative.' });
        }
        const fields = Object.keys(parsed.data);
        const values = Object.values(parsed.data);
        try {
            const { rows } = await pool.query(
                `INSERT INTO public.products (${fields.map(field => `"${field}"`).join(', ')}) VALUES (${values.map((_, i) => `$${i + 1}`).join(', ')}) RETURNING ${columns}`,
                values,
            );
            res.status(201).json(rows[0]);
        } catch (err) {
            res.status(err.code === '23503' ? 400 : 500).json({ err: err.code === '23503' ? 'Select an existing category.' : 'Unable to create product.' });
        }
    });
    router.patch('/products/:id', async (req, res) => {
        const parsed = productSchema.safeParse(req.body);
        if (!idSchema.safeParse(req.params.id).success || !parsed.success) {
            return res.status(400).json({ err: 'Check the product fields. Name and price are required; prices and stock cannot be negative.' });
        }
        const fields = Object.keys(parsed.data);
        const values = Object.values(parsed.data);
        try {
            const { rows } = await pool.query(`UPDATE public.products SET ${fields.map((field, i) => `"${field}" = $${i + 1}`).join(', ')} WHERE id = $${values.length + 1} RETURNING ${columns}`, [...values, req.params.id]);
            if (!rows.length) return res.status(404).json({ err: 'Product no longer exists.' });
            res.json(rows[0]);
        } catch (err) {
            res.status(err.code === '23503' ? 400 : 500).json({ err: err.code === '23503' ? 'Select an existing category.' : 'Unable to update product.' });
        }
    });
    router.delete('/products/:id', async (req, res) => {
        if (!idSchema.safeParse(req.params.id).success) return res.status(400).json({ err: 'Invalid product ID.' });
        try {
            const result = await pool.query('DELETE FROM public.products WHERE id = $1 RETURNING id', [req.params.id]);
            if (!result.rows.length) return res.status(404).json({ err: 'Product no longer exists.' });
            res.json({ deleted: true });
        } catch (err) {
            res.status(err.code === '23503' ? 409 : 500).json({ err: err.code === '23503' ? 'This product is referenced by other records and cannot be deleted.' : 'Unable to delete product.' });
        }
    });
    return router;
};
