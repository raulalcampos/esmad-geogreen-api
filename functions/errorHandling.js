// require/import modules and configuration
const express = require("express");
const server = express();
// function to handle some error
async function error(){
    server.use((error, request, response, next) => {
        console.log(error);
        response.status(500).json({message: error});
    });
}
// export functions
module.exports = { error }