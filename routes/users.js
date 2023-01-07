// require/import modules and configuration
const express = require('express');
const router = express.Router();
const pool = require("../database").pool;
const email = require('../functions/email');
const randomCode = require('../functions/randomCode');
const security = require('../functions/security');
const handle = require('../functions/errorHandling');
const { body, validationResult } = require('express-validator');

// List users
router.get("/", async (request, response) => {
    const bearerHeader = request.headers['authorization'];
    if(typeof bearerHeader !== "undefined"){
        const token = bearerHeader.split(' ')[1];
        const valid = await security.verify(token);
        if(valid){
            const [userDB] = await pool.query(`SELECT * FROM users WHERE email = "${valid.email}"`);
            if(userDB[0].admin == 1){
                if(request.query.id && request.query.id >= 1){
                    const [result] = await pool.query("SELECT * FROM users WHERE id =" + request.query.id);
                    if(result == ""){
                        response.status(404).json({message: "error", info: "User not found in our database."});
                    } else {
                        response.status(200).json({message: "sucess", info: result});
                    }
                } else {
                    const [result] = await pool.query("SELECT * FROM users");
                    response.status(200).json({message: "sucess", info: result});
                }
            } else {
                response.status(403).json({message: "error", info: "Only administrators can access this feature."});
            }
        } else {
            response.status(403).json({message: "error", info: "Invalid token, please login again."});
        }
    } else {
        response.status(401).json({message: "error", info: "You need to be authenticated for this."});
    }
    // catch some error
    handle.error();
});

// Register
router.post("/register", 
    [
        body('name').notEmpty().escape(),
        body('email').isEmail(), 
        body('password').isLength({ min: 5 }),
        body('picture').notEmpty().escape()
    ],
    async (request, response) => {
    const errors = validationResult(request);
    if(errors.isEmpty()){
        const [userDB] = await pool.query(`SELECT * FROM users WHERE email = "${request.body.email}"`);
        if(userDB == 0){
            let hashedPassword = await security.hashPassword(request.body.password, 10);
            let verificationCode = randomCode.generate(10);
            const [result] = await pool.query(`INSERT INTO users VALUES (NULL, '${request.body.name}', '${request.body.email}', '${hashedPassword}', 0, '${verificationCode}', '${request.body.picture}', 0)`);
            email.send(0, request.body.email, "GeoGreen - Account Checker", "Check your new account", {username: request.body.name, userId: result.insertId, verificationCode: verificationCode});
            response.status(201).json({message: "sucess", info: {id: result.insertId, email: request.body.email}});
            console.log(`New user registred with email ${request.body.email}.`)
        } else {
            response.status(406).json({message: "error", info: "There is already a user with that email registered in our database. Please use another email to register."});
        }
    } else {
        response.status(400).json({message: "error", info: "Bad Resquest. Please check the documentation of the API.", errors: errors.array()});
    }
    // catch some error
    handle.error();
});
// Login
router.post("/login",
    [
        body('email').isEmail(), 
        body('password').isLength({ min: 5 })
    ],
    async (request, response) => {
    const errors = validationResult(request);
    if(errors.isEmpty()){
        const [userDB] = await pool.query(`SELECT * FROM users WHERE email = "${request.body.email}"`);
        if(userDB != 0){
            const compare = await security.compare(request.body.password, userDB[0].password);
            if(compare == true){
                const token = await security.generate({email: request.body.email}, "15d");
                response.status(200).json({message: "sucess", token: token});
            } else {
                response.status(401).json({message: "error", info: "The entered password is wrong."});
            }
        } else {
            response.status(404).json({message: "error", info: "This email was not found in our database."});
        }
    } else {
        response.status(400).json({message: "error", info: "Bad Resquest. Please check the documentation of the API.", errors: errors.array()});
    }
    // catch some error
    handle.error();
});

// Logout
router.delete("/logout", async (request, response) => {
    const bearerHeader = request.headers['authorization'];
    if(typeof bearerHeader !== "undefined"){
        const token = bearerHeader.split(' ')[1];
        const [tokenDB] = await pool.query(`SELECT * FROM invalidtokens WHERE token = "${token}"`);
        if(tokenDB == 0){
            await pool.query(`INSERT INTO invalidtokens VALUES ('${token}')`);
            response.status(200).json({message: "sucess", info: "Token deleted successfully. You are logged out from the server side."});
        } else {
            response.status(406).json({message: "error", info: "That token has already been purged."});
        }
    } else {
        response.status(401).json({message: "error", info: "No token found to logout."});
    }
    // catch some error
    handle.error();
});

// Edit profile settinges
router.put("/",
    [
        body('name').notEmpty().escape(),
        body('picture').notEmpty().escape()
    ],
    async (request, response) => {
    const errors = validationResult(request);
    if(errors.isEmpty()){
        const bearerHeader = request.headers['authorization'];
        if(typeof bearerHeader !== "undefined"){
            const token = bearerHeader.split(' ')[1];
            const valid = await security.verify(token);
            if(valid){
                await pool.query(`UPDATE users SET name = '${request.body.name}', picture = '${request.body.picture}' WHERE email = '${valid.email}'`);
                response.status(200).json({message: "sucess", info: "Profile Settings successfully edited."});
            } else {
                response.status(403).json({message: "error", info: "Invalid token, please login again."});
            }
        } else {
            response.status(401).json({message: "error", info: "No token found for edit profile settings."});
        }
    } else {
        response.status(400).json({message: "error", info: "Bad Resquest. Please check the documentation of the API.", errors: errors.array()});
    }
    // catch some error
    handle.error();
});

// Edit security settinges
router.put("/security",
    [
        body('password').isLength({ min: 5 })
    ],
    async (request, response) => {
    const errors = validationResult(request);
    if(errors.isEmpty()){
        const bearerHeader = request.headers['authorization'];
        if(typeof bearerHeader !== "undefined"){
            const token = bearerHeader.split(' ')[1];
            const valid = await security.verify(token);
            if(valid){
                let hashedPassword = await security.hashPassword(request.body.password, 10);
                await pool.query(`UPDATE users SET password = '${hashedPassword}' WHERE email = '${valid.email}'`);
                const [userDB] = await pool.query(`SELECT * FROM users WHERE email = "${valid.email}"`);
                response.status(200).json({message: "sucess", info: "Security Settings updated successfully."});
                email.send(2, valid.email, "GeoGreen - Security Alert", "Updated Password", {username: userDB[0].name});
            } else {
                response.status(403).json({message: "error", info: "Invalid token, please login again."});
            }
        } else {
            response.status(401).json({message: "error", info: "No token found for edit security setthings."});
        }
    } else {
        response.status(400).json({message: "error", info: "Bad Resquest. Plase check the documentation of the API.", errors: errors.array()});
    }
    // catch some error
    handle.error();
});

// Delete
router.delete("/", async (request, response) => {
    const bearerHeader = request.headers['authorization'];
    if(typeof bearerHeader !== "undefined"){
        const token = bearerHeader.split(' ')[1];
        const valid = await security.verify(token);
        if(valid){
            const [userDB] = await pool.query(`SELECT * FROM users WHERE email = "${valid.email}"`);
            if(userDB != ""){
                email.send(3, valid.email, "GeoGreen - Account Manager", "Account Deleted", {username: userDB[0].name});
                await pool.query(`DELETE FROM users WHERE email = '${valid.email}'`);
                response.status(200).json({message: "sucess", info: "Account Deleted Successfully."});
            } else {
                response.status(404).json({message: "error", info: "This user has already been deleted."});
            }
        } else {
            response.status(403).json({message: "error", info: "Invalid token, please login again."});
        }
    } else {
        response.status(401).json({message: "error", info: "No token found for delete user."});
    }
    // catch some error
    handle.error();
});

// export routes
module.exports = router;