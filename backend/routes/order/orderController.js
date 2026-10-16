const pool = require("../../dbConnection")
const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

const GetOrders = async (req, res) => {

    try {
        const { rows } = await pool.query("SELECT * FROM orders");
        console.log(rows);
        res.json(rows);
    } catch (err) {
        console.log(err);
        res.json({ "err": err.message })
    }
}

const PlaceOrder = async (req, res) => {
    const { user_id, cart_arr, address } = req.body

    let total = 0
    let itemsInfo = []

    // id, order_id, product_id, purchase_price, quantity, created_at
    for (const item of cart_arr) {
        console.log(item);
        const { rows } = await pool.query("SELECT * FROM products WHERE id = $1", [item.item_id])

        const row = rows[0];
        if (!row) {
            return res.status(404).json({
                err: `Product ${item.item_id} not found`
            })
        }
        const info = { ...row, quantity: item.quantity }
        itemsInfo.push(info)
        total += (row.price * 1000) * item.quantity
    }

    let connection

    try {
        connection = await pool.connect()
        await connection.query("BEGIN")

        const { rows } = await connection.query(
            "INSERT INTO orders (user_id, total) VALUES ($1, $2) RETURNING id",
            [user_id, total / 1000]
        )
        const order_id = rows[0].id;


        for (const item of itemsInfo) {
            console.log(item);
            const { rows } = await connection.query(
                "INSERT INTO order_items (order_id, product_id, purchase_price, quantity) VALUES ($1, $2, $3, $4)",
                [order_id, item.id, item.price, item.quantity]
            )
        }
        await connection.query("COMMIT");

        // Send order email
        try {
            const itemsHtml = itemsInfo.map(item => {
                const itemTotal = Number(item.price) * item.quantity;

                return `
            <tr>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">
                    ${item.name}
                </td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: center;">
                    ${item.quantity}
                </td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;">
                    ${Number(item.price).toFixed(3)} KD
                </td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;">
                    ${itemTotal.toFixed(3)} KD
                </td>
            </tr>
        `;
            }).join("");

            const { data, error } = await resend.emails.send({
                from: "onboarding@resend.dev",
                to: "salebeast.kw@gmail.com",
                subject: `New Order #${order_id}`,
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 700px; margin: auto;">

                        <h2>New Order #${order_id}</h2>

                        <p>A new order has been placed.</p>

                        <h3>Order Details</h3>

                        <table style="width: 100%; border-collapse: collapse;">
                            <thead>
                                <tr style="background-color: #f5f5f5;">
                                    <th style="padding: 10px; text-align: left;">
                                        Product
                                    </th>
                                    <th style="padding: 10px; text-align: center;">
                                        Quantity
                                    </th>
                                    <th style="padding: 10px; text-align: right;">
                                        Unit Price
                                    </th>
                                    <th style="padding: 10px; text-align: right;">
                                        Total
                                    </th>
                                </tr>
                            </thead>

                            <tbody>
                                ${itemsHtml}
                            </tbody>
                        </table>

                        <h3 style="text-align: right; margin-top: 20px;">
                            Total: ${Number(total / 1000).toFixed(3)} KD
                        </h3>
                        <h3>Delivery Address</h3>

                        <p>
                            <strong>Street:</strong> ${address.street}<br>
                            <strong>Building:</strong> ${address.building}<br>
                            <strong>Floor:</strong> ${address.floor}<br>
                            <strong>Flat:</strong> ${address.flat}<br>
                            <strong>Notes:</strong> ${address.notes || "None"}
                        </p>

                        <p style="color: #666;">
                            User ID: ${user_id}
                        </p>

                    </div>
                `
            });

            if (error) {
                console.error("Resend error:", error);
            } else {
                console.log("Order email sent:", data);
            }

        } catch (emailError) {
            console.error("Failed to send order email:", emailError);
        }

        return res.status(201).json({ "msg": "success" });
    } catch (err) {
        if (connection) {
            await connection.query("ROLLBACK");
        }
        console.error(err);
        return res.status(500).json({ err: err.message });
    } finally {
        if (connection) {
            connection.release();
        }
    }
}


module.exports = {
    GetOrders,
    PlaceOrder
}