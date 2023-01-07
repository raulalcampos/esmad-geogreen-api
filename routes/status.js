const express = require('express');
const router = express.Router();

router.get("/", async (request, response) => {
    response.status(200).json({message: "sucess", info: "Server its running."});
    console.log("Server its running.")
  })

module.exports = router;