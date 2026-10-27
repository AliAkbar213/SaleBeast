const pool = require("../../dbConnection")

const GetAllProducts = async (req, res) => {
    let query = `SELECT id, name, price, stock, image FROM products`
    const params = []
    const conditions = []

    // const { brand = "all", storage = "all", deviceType = "all", sortBy = "date", sortOrder = "ASC" } = req.query

    if (req.query.q) {
        params.push(`%${req.query.q}%`)
        conditions.push(`name ILIKE $${params.length}`)
    }
    if (req.query.category) {
        params.push(parseInt(req.query.category, 10));
        conditions.push(`category_id = $${params.length}`);
    }
    if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(" AND ")}`;
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = 15;
    const offset = (page - 1) * limit;
    query += ` ORDER BY id ASC LIMIT ${limit} OFFSET ${offset}`

    console.log(query, params);

    try {
        const { rows } = await pool.query(query, params);
        console.log(rows);
        res.json(rows);

    } catch (err) {
        console.log(err);
        res.status(500).json({ err: err.message })
    }
}


const GetProductDetails = async (req, res) => {
    const id = req.params.id;

    const query = `
        SELECT 
            products.id,
            products.name,
            products.desc,
            products.key_features,
            products.price,
            products.stock,
            products.image,
            categories.name AS category
        FROM products
        JOIN categories ON products.category_id = categories.id
        WHERE products.id = $1
    `;

    try {
        const { rows } = await pool.query(query, [id]);

        if (rows.length === 0) {
            return res.status(404).json({ err: "No product found" });
        }

        res.json(rows[0]);

    } catch (err) {
        console.log(err);
        res.status(500).json({ err: err.message });
    }
};

const GetCategories = async (req, res) => {

    query = `SELECT * FROM categories`

    console.log(query);

    try {
        const { rows } = await pool.query(query);
        res.json(rows);

    } catch (err) {
        res.json({ "err": err.message })
    }
}

const GetProductByCategory = async (req, res) => {
    query = `SELECT products.id, products.name, price, brands.name as brand, created_at
            FROM products JOIN brands ON products.brand_id = brands.id JOIN categories ON products.category_id = categories.id`

    // if (req.query.q){
    //     query += ` WHERE products.name LIKE "%${req.query.q}%"`
    // }

    query += ` WHERE categories.name LIKE "%${req.params.name}%"`
    const page = parseInt(req.query.page) || 1
    query += ` ORDER BY price`
    query += ` LIMIT 15 OFFSET ${15 * (page - 1)}`
    console.log(query);

    try {
        const { rows } = await pool.query(query);
        res.json(rows);

    } catch (err) {
        res.json({ "err": err.message })
    }
}


// const AddProduct = async(req, res) => {
//     const {item, category, price} = req.body
//     try {
//         const [row] = await pool.execute("INSERT INTO products (item, category, price) VALUES ( ?, ?, ?)",
//              [item, category, price])
//         res.status(201).json({
//             id: row.insertId,
//             item,
//             category,
//             price
//         });
//     } catch (err) {
//         res.json({"err" : err.message})
//     }
// }
// 
// const UpdateProduct = async (req, res) => {
//     const id = req.params.id
//     const keys = []
//     const values = []
//     for (key in req.body){
//         keys.push(`${key} = ?`);
//         values.push(req.body[key]);
//     }
//     const update = keys.join(',')

//     try {
//         const [row] = await pool.execute(`UPDATE products SET ${update} WHERE id = ${id}`,values)
//         res.json(row);
//     } catch (err) {
//         res.json({"err" : err.message})
//     }
// }

// const DeleteProduct = async (req, res) => {
//     const id = req.params.id

//     try {
//         const [row] = await pool.execute(`DELETE FROM products WHERE id = ${id}`)
//         res.json(row);
//     } catch (err) {
//         res.json({"err" : err.message})
//     }
// }

module.exports = {
    GetAllProducts,
    GetCategories,
    GetProductByCategory,
    GetProductDetails
}
