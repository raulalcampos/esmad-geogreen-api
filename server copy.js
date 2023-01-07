// require/import modules and configuration
    const express = require("express");
    const server = express();
    const pool = require("./database").pool;
    const bcrypt = require("bcrypt");
    const nodemailer = require("nodemailer");
    server.use(express.json());
    
// GET method
    // GET "user"
    server.get("/users", async (request, response) => {
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
    // POST "user"
    server.post("/users", async (request, response) => {
        if(request.body.name && request.body.email && request.body.password && request.body.picture){
            let hashedPassword = await hashPassword(request.body.password, 10);
            let verificationCode = randomCode(10);
            const [result] = await pool.query(`INSERT INTO users VALUES (NULL, '${request.body.name}', '${request.body.email}', '${hashedPassword}', 0, '${verificationCode}', '${request.body.picture}')`);
            sendEmail(0, request.body.email, "GeoGreen - Account Checker", "Check your new account", {username: request.body.name, userId: result.insertId, verificationCode: verificationCode});
            response.status(201).json({message: "sucess", info: {id: result.insertId, email: request.body.email}});
        } else {
            response.status(400).json({message: "Bad Resquest. Please check the documentation of the API."});
        }
    });

// Error Handling
    server.use((error, request, response, next) => {
        console.log(error);
        response.status(500).json({message: error});
    });
    server.all('*', function(request, response) {
        response.status(400).json({message: "Bad Resquest. Please check the documentation of the API."});
    });
     
// function to hash some Password
    async function hashPassword(password, rounds){
        const hash = await bcrypt.hash(password, rounds);
        return hash;
    }
// function to set a Random Code
    function randomCode(length) {
        let result = '';
        let characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let charactersLength = characters.length;
        for(let i = 0; i < length; i++ ) {
            result += characters.charAt(Math.floor(Math.random() * charactersLength));
        }
        return result;
    }
// function to send some Email
    async function sendEmail(type, to, name, subject, message){
        // types: 0: account checker, 1: recover password
        let transporter = nodemailer.createTransport({
            host: 'smtp.hostinger.com',
            port: 465,
            secure: true,
            auth: {
              user: 'dtam-pi2@esmad.raulcampos.net',
              pass: 'DTAM@pi2'
            },
            tls: {
                rejectUnauthorized: false
            }
        });
        let mailOptions = {};
        if(type == 0){
            mailOptions = {
                from: {
                    name: name,
                    address: 'dtam-pi2@esmad.raulcampos.net'
                },
                to: to,
                subject: subject,
                html: `<p> Hello, ${message.username}! </p>
                <p> Thank you very much for creating an GeoGreen account! </p>
                <p> In order to use our application, please verify your account by clicking on this link: https://esmad.raulcampos.net/dtam-pi2/checkaccount?userid=${message.userId}&verificationcode=${message.verificationCode} </p>
                <p> The GeoGreen Team 💚 ! </p>`
            };
        } else if (type == 1){
            mailOptions = {
                from: {
                    name: name,
                    address: 'dtam-pi2@esmad.raulcampos.net'
                },
                to: to,
                subject: subject,
                text : message
            };
        }
        transporter.sendMail(mailOptions, function (error, sucess) {
            if(error){
              console.log(error);
              return ('Error while sending email' + error)
            } else {
              console.log("Email successfully sent!");
              return ('Email successfully sent!')
            }
          });
    }
// Set Server Port
    let serverPort = process.env.PORT || 3000;
    server.listen(serverPort, () => console.log("Server runing on port " + serverPort + "."));