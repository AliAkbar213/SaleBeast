const pool = require("../../dbConnection")

const GetGovernorate = async (req, res) => {
    try {
        const { rows } = await pool.query(`
            SELECT id, name, delivery_charge
            FROM governorate
            ORDER BY name ASC
        `)

        return res.json(rows)
    } catch (err) {
        console.error("Failed to get governorates:", err)
        return res.status(500).json({ err: "Failed to get governorates" })
    }
}

const GetArea = async (req, res) => {
    const governorateId = Number.parseInt(req.query.governorate_id, 10)

    if (!Number.isSafeInteger(governorateId) || governorateId <= 0) {
        return res.status(400).json({ err: "A valid governorate_id is required" })
    }

    try {
        const { rows } = await pool.query(`
            SELECT
                area.id,
                area.name,
                area.governorate_id,
                COALESCE(area.delivery_charge_override, governorate.delivery_charge) AS delivery_charge,
                area.delivery_charge_override IS NOT NULL AS has_delivery_charge_override
            FROM area
            JOIN governorate ON governorate.id = area.governorate_id
            WHERE area.governorate_id = $1
            ORDER BY area.name ASC
        `, [governorateId])

        return res.json(rows)
    } catch (err) {
        console.error("Failed to get areas:", err)
        return res.status(500).json({ err: "Failed to get areas" })
    }
}

module.exports = {
    GetGovernorate,
    GetArea
}
