const express = require('express');
const router = express.Router();
const pool = require("../database").pool;
const email = require('../functions/email');
const randomCode = require('../functions/randomCode');
const security = require('../functions/security');

// GET method
router.get("/", async (request, response) => {
    if(request.query.id && request.query.id >= 1){
        const [result] = await pool.query("SELECT * FROM users WHERE id =" + request.query.id);
        if(result == ""){
            response.status(404).json({message: "User not found in our database."});
        } else {
            response.status(200).json({message: "sucess", info: result});
        }
    } else {
        const [result] = await pool.query("SELECT * FROM users");
        response.status(200).json({message: "sucess", info: result});
    }
});

// POST method
router.post("/", async (request, response) => {
    if(request.body.name && request.body.email && request.body.password && request.body.picture){
        let hashedPassword = await security.hashPassword(request.body.password, 10);
        let verificationCode = randomCode.generate(10);
        const [result] = await pool.query(`INSERT INTO users VALUES (NULL, '${request.body.name}', '${request.body.email}', '${hashedPassword}', 0, '${verificationCode}', '${request.body.picture}')`);
        email.send(0, request.body.email, "GeoGreen - Account Checker", "Check your new account", {username: request.body.name, userId: result.insertId, verificationCode: verificationCode});
        response.status(201).json({message: "sucess", info: {id: result.insertId, email: request.body.email}});
    } else {
        response.status(400).json({message: "Bad Resquest. Please check the documentation of the API."});
    }
});

module.exports = router;