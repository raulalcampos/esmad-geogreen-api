const express = require('express');
const router = express.Router();

router.get("/", async (request, response) => {
  try {
    response.status(200).json({message: "sucess", info: "Server its running."});
    console.log("Server its running.");
  } catch(error){
    response.status(500).json({ message: "error", info: "Internal error." })
  }
})
// export routes
module.exports = router;