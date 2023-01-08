const express = require('express');
const router = express.Router();
const handle = require('../functions/errorHandling');

router.get("/info", async (request, response) => {
  response.status(200).json({message: "sucess", info: "Server its running."});
  console.log("Server its running.")
  // catch some error
  handle.error();
})
// export routes
module.exports = router;