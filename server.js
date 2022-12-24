// require/import modules and configuration
    const express = require("express");
    const server = express();
    const pool = require("./database").pool;
    server.use(express.json());

// GET method
    // GET "user"
    server.get("/user", async (request, response) => {
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
    server.post("/user", async (request, response) => {
        if(request.body.name && request.body.email){
            const [result] = await pool.query("NSERT INTO users (name, email) VALUES (" + request.body.name + ", " + request.body.email + ")");
            response.status(201).json({message: "sucess", info: result});
        } else {
            response.status(400).json({message: "Bad Resquest. Please check the documentation of the API."});
        }
    });

// Error Handling
    server.use((error, request, response, next) => {
        console.log(error)
        response.status(500).json({message: error});
    });
    server.all('*', function(request, response) {
        response.status(400).json({message: "Bad Resquest. Please check the documentation of the API."});
    });
     
// Set Server Port
    let serverPort = 3000;
    server.listen(serverPort, () => console.log("Server listen listening port " + serverPort + "."));

    console.log(text)