// import and config modules
    const mySQL = require("mysql2");
    const dotenv = require("dotenv");
    dotenv.config();

    const pool = mySQL.createPool({
        host: process.env.GG_HOST,
        database: process.env.GG_DATABASE,
        user: process.env.GG_USER,
        password: process.env.GG_PASSWORD
    }).promise();

    exports.pool = pool;