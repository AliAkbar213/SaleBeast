const { Pool } = require("pg");
require("dotenv").config()

const pool = new Pool({
    connectionString: process.env.DB_CONNECTION_STRING,

    max: 20,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 60000,
    
    ssl: {
        rejectUnauthorized: false
    }
});

module.exports = pool