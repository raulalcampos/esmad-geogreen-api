// require/import modules and configuration
const express = require("express");
const server = express();
const pool = require("./database").pool;
const users = require("./routes/users");
const serverInfo = require("./routes/status");
server.use(express.json());

// "Server Info"
server.use('/info/status', serverInfo);

// "Users"
server.use('/users', users);

// Error Handling
server.use((error, request, response, next) => {
    console.log(error);
    response.status(500).json({message: error});
});
server.all('*', function(request, response) {
    response.status(400).json({message: "Bad Resquest. Please check the documentation of the API."});
});
     
// Set Server Port
let serverPort = process.env.PORT || 3000;
server.listen(serverPort, () => console.log("Server runing on port " + serverPort + "."));