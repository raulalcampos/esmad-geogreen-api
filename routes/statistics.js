const express = require('express');
const router = express.Router();
const pool = require("../database").pool;
const security = require('../functions/security');
const { body, validationResult } = require('express-validator');
const handle = require('../functions/errorHandling');

// update statistics (kilograms of recycled garbage of this month)
router.put("/",
  [
    body('kilograms').isNumeric()
  ],
  async (request, response) => {
    const errors = validationResult(request);
    if(errors.isEmpty()){
      const bearerHeader = request.headers['authorization'];
      if(typeof bearerHeader !== "undefined"){
        const token = bearerHeader.split(' ')[1];
        const valid = await security.verify(token);
        if(valid){
          // set current mont and year
          const date = new Date();
          let month = date.getMonth() + 1;
          let year = date.getFullYear();
          let currentMonthAndYear = month + "_" + year;
          // update statistics from database
          await pool.query(`UPDATE userstatistics SET ${currentMonthAndYear} = '${request.body.kilograms}' WHERE id = "${valid.id}"`);
          // get user statistics info from database
          const [statistics] = await pool.query(`SELECT * FROM userstatistics WHERE id = "${valid.id}"`);
          // hide user id to the outside
          let statisticsWithOutId = statistics.shift();
          delete statisticsWithOutId.id
          response.status(200).json({message: "sucess", info: "This month's kilograms have been updated.", statistics: statisticsWithOutId});

        } else {
          response.status(403).json({message: "error", info: "Invalid token, please login again."});
        }
      } else {
        response.status(401).json({message: "error", info: "No token found for edit Statistics."});
      }
    } else {
      response.status(400).json({message: "error", info: "Bad Resquest. Please check the documentation of the API.", errors: errors.array()});
    }
    // catch some error
    handle.error();
})
// export routes
module.exports = router;