// require/import modules and configuration
const express = require('express');
const router = express.Router();
const pool = require("../database").pool;
const email = require('../functions/email');
const randomCode = require('../functions/randomCode');
const security = require('../functions/security');
const { body, validationResult } = require('express-validator');

// List users
router.get("/", async (request, response) => {
    try {
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
    } catch(error){
        response.status(500).json({ message: "error", info: "Internal error." })
    }
});

// Register
router.post("/", 
    [
        body('name').notEmpty().escape(),
        body('email').isEmail(), 
        body('password').isLength({ min: 5 }),
        body('picture').notEmpty().escape(),
        body('notification1').isNumeric(),
        body('notification2').isNumeric(),
        body('notification3').isNumeric()
    ],
    async (request, response) => {
        try {
            const errors = validationResult(request);
            if(errors.isEmpty()){
                // check if user already existis
                const [userDB] = await pool.query(`SELECT * FROM users WHERE email = "${request.body.email}"`);
                if(userDB == 0){
                    // hash password
                    let hashedPassword = await security.hashPassword(request.body.password, 10);
                    // generate verificationCode
                    let verificationCode = randomCode.generate(10);
                    // register user
                    const [result] = await pool.query(`INSERT INTO users VALUES (NULL, '${request.body.name}', '${request.body.email}', '${hashedPassword}', 0, '${verificationCode}', '${request.body.picture}', 0)`);
                    // register user notifications settings
                    await pool.query(`INSERT INTO usersnotifications VALUES ('${result.insertId}', '${request.body.notification1}', '${request.body.notification2}', '${request.body.notification3}')`);
                    // register user statistics
                    await pool.query(`INSERT INTO userstatistics (id) VALUES (${result.insertId})`);
                    // generate token
                    const token = await security.generate({id: result.insertId, email: request.body.email}, "15d");
                    // send verification email
                    email.send(0, request.body.email, "GeoGreen - Account Checker", "Check your new account", {username: request.body.name, userId: result.insertId, verificationCode: verificationCode});
                    
                    response.status(201).json({message: "sucess", info: {email: request.body.email}, token: token});
                    console.log(`New user registred with email ${request.body.email}.`)
                } else {
                    response.status(406).json({message: "error", info: "There is already a user with that email registered in our database. Please use another email to register."});
                }
            } else {
                response.status(400).json({message: "error", info: "Bad Resquest. Please check the documentation of the API.", errors: errors.array()});
            }
        } catch(error){
            response.status(500).json({ message: "error", info: "Internal error." })
        }
});
// Login
router.post("/login",
    [
        body('email').isEmail(), 
        body('password').isLength({ min: 5 })
    ],
    async (request, response) => {
        try {
            const errors = validationResult(request);
            if(errors.isEmpty()){
                // get user info from database
                const [userDB] = await pool.query(`SELECT * FROM users WHERE email = "${request.body.email}"`);
                if(userDB != 0){
                    // generate token
                    const compare = await security.compare(request.body.password, userDB[0].password);
                    if(compare == true){
                        // generate token
                        const token = await security.generate({id: userDB[0].id, email: request.body.email}, "15d");
                        // get user notifications info from database
                        const [notifications] = await pool.query(`SELECT * FROM usersnotifications WHERE id = "${userDB[0].id}"`);
                        // get user statistics info from database
                        const [statistics] = await pool.query(`SELECT * FROM userstatistics WHERE id = "${userDB[0].id}"`);
                        // hide user id to the outside
                        let statisticsWithOutId = statistics.shift();
                        delete statisticsWithOutId.id
        
                        response.status(200).json({message: "sucess", userinfo: {name: userDB[0].name, picture: userDB[0].picture, notifications: {notification1: notifications[0].notification1, notification2: notifications[0].notification2, notification3: notifications[0].notification3}, statistics: statisticsWithOutId}, token: token});
                    } else {
                        response.status(401).json({message: "error", info: "The entered password is wrong."});
                    }
                } else {
                    response.status(404).json({message: "error", info: "This email was not found in our database."});
                }
            } else {
                response.status(400).json({message: "error", info: "Bad Resquest. Please check the documentation of the API.", errors: errors.array()});
            }
        } catch(error){
            response.status(500).json({ message: "error", info: "Internal error." })
        }
});

// Logout
router.delete("/logout", async (request, response) => {
    try {
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
    } catch(error){
        response.status(500).json({ message: "error", info: "Internal error." })
    }
});

// Check token validity
router.get("/verify", async (request, response) => {
    try {
        const bearerHeader = request.headers['authorization'];
        if(typeof bearerHeader !== "undefined"){
            const token = bearerHeader.split(' ')[1];
            const valid = await security.verify(token);
            if(valid){
                response.status(200).json({message: "sucess", info: "This token is valid."});
            } else {
                response.status(403).json({message: "error", info: "Invalid token, please login again."});
            }
        } else {
            response.status(401).json({message: "error", info: "No token found for verify veracity."});
        }
    } catch(error){
        response.status(500).json({ message: "error", info: "Internal error." })
    }
});


// Edit profile settinges
router.put("/",
    [
        body('name').notEmpty().escape(),
        body('picture').notEmpty().escape()
    ],
    async (request, response) => {
        try {
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
                    response.status(401).json({message: "error", info: "No token found for edit Profile Settings."});
                }
            } else {
                response.status(400).json({message: "error", info: "Bad Resquest. Please check the documentation of the API.", errors: errors.array()});
            }
        } catch(error){
            response.status(500).json({ message: "error", info: "Internal error." })
        }
});

// Edit notifications settinges
router.put("/notifications",
    [
        body('notification1').isNumeric(),
        body('notification2').isNumeric(),
        body('notification3').isNumeric()
    ],
    async (request, response) => {
        try {
            const errors = validationResult(request);
            if(errors.isEmpty()){
                const bearerHeader = request.headers['authorization'];
                if(typeof bearerHeader !== "undefined"){
                    const token = bearerHeader.split(' ')[1];
                    const valid = await security.verify(token);
                    if(valid){
                        await pool.query(`UPDATE usersnotifications SET notification1 = '${request.body.notification1}', notification2 = '${request.body.notification2}', notification3 = '${request.body.notification3}' WHERE id = '${valid.id}'`);
                        response.status(200).json({message: "sucess", info: "Notifications Settings successfully edited."});
                    } else {
                        response.status(403).json({message: "error", info: "Invalid token, please login again."});
                    }
                } else {
                    response.status(401).json({message: "error", info: "No token found for edit Notifications Settings."});
                }
            } else {
                response.status(400).json({message: "error", info: "Bad Resquest. Please check the documentation of the API.", errors: errors.array()});
            }
        } catch(error){
            response.status(500).json({ message: "error", info: "Internal error." })
        }
});

// Edit security settinges
router.put("/security",
    [
        body('password').isLength({ min: 5 })
    ],
    async (request, response) => {
        try {
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
                    response.status(401).json({message: "error", info: "No token found for edit Security Setthings."});
                }
            } else {
                response.status(400).json({message: "error", info: "Bad Resquest. Plase check the documentation of the API.", errors: errors.array()});
            }
        } catch(error){
            response.status(500).json({ message: "error", info: "Internal error." })
        }
});

// Recover password
// Send a link to recover the password
router.put("/security/recover/sendcode",
    [
        body('email').isEmail()
    ],
    async (request, response) => {
        try {
            const errors = validationResult(request);
            if(errors.isEmpty()){
                const [userDB] = await pool.query(`SELECT * FROM users WHERE email = "${request.body.email}"`);
                if(userDB == ""){
                    response.status(404).json({message: "error", info: "User not found in our database."});
                } else {
                    let verificationCode = randomCode.generate(10);
                    await pool.query(`UPDATE users SET verificationcode = '${verificationCode}' WHERE email = '${request.body.email}'`);
                    response.status(200).json({message: "sucess", info: "Ecopoint successfully updated."});
                    email.send(1, request.body.email, "GeoGreen - Security Settings", "Recover Password", {username: userDB[0].name, userId: userDB[0].id, verificationCode: verificationCode});
                }
            } else {
                response.status(400).json({message: "error", info: "Bad Resquest. Plase check the documentation of the API.", errors: errors.array()});
            }
        } catch(error){
            response.status(500).json({ message: "error", info: "Internal error." })
        }
});
// Recover with code
router.put("/security/recover",
    [
        body('id').notEmpty().escape(),
        body('verificationCode').isLength({min: 5 }).escape(),
        body('password').isLength({ min: 5 })
    ],
    async (request, response) => {
        try {
            const errors = validationResult(request);
            if(errors.isEmpty()){
                const [userDB] = await pool.query(`SELECT * FROM users WHERE id = "${request.body.id}"`);
                if(userDB == ""){
                    response.status(404).json({message: "error", info: "User not found in our database."});
                } else {
                    if(userDB[0].verificationcode == request.body.verificationCode){
                        let hashedPassword = await security.hashPassword(request.body.password, 10);
                        await pool.query(`UPDATE users SET password = '${hashedPassword}' WHERE id = '${request.body.id}'`);
                        response.status(200).json({message: "sucess", info: "Password successfully updated."});
                        email.send(2, userDB[0].email, "GeoGreen - Security Alert", "Updated Password", {username: userDB[0].name});
                    } else {
                        response.status(401).json({message: "error", info: "Wrong recovery code."});
                    }
                }
            } else {
                response.status(400).json({message: "error", info: "Bad Resquest. Plase check the documentation of the API.", errors: errors.array()});
            }
        } catch(error){
            response.status(500).json({ message: "error", info: "Internal error." })
        }
});

// Delete
router.delete("/", async (request, response) => {
    try {
        const bearerHeader = request.headers['authorization'];
        if(typeof bearerHeader !== "undefined"){
            const token = bearerHeader.split(' ')[1];
            const valid = await security.verify(token);
            if(valid){
                const [userDB] = await pool.query(`SELECT * FROM users WHERE email = "${valid.email}"`);
                if(userDB != ""){
                    // Send Alert email ("your account are deleted")
                    email.send(3, valid.email, "GeoGreen - Account Manager", "Account Deleted", {username: userDB[0].name});
                    // Delete notifications of user
                    await pool.query(`DELETE FROM usersnotifications WHERE id = '${valid.id}'`);
                    // Delete statistics of user
                    await pool.query(`DELETE FROM userstatistics WHERE id = '${valid.id}'`);
                    // Delete user
                    await pool.query(`DELETE FROM users WHERE email = '${valid.email}'`);
                    // Insert current token in black list of database to prever mau uso da API
                    await pool.query(`INSERT INTO invalidtokens VALUES ('${token}')`);
    
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
    } catch(error){
        response.status(500).json({ message: "error", info: "Internal error." })
    }
});

// export routes
module.exports = router;