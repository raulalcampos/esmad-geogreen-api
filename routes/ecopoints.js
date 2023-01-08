const express = require('express');
const router = express.Router();
const pool = require("../database").pool;
const security = require('../functions/security');
const { body, validationResult } = require('express-validator');

// List ecopoints
router.get("/", async (request, response) => {
  try {
    if(request.query.id && request.query.id > 0){
      const [result] = await pool.query("SELECT * FROM ecopoints WHERE id =" + request.query.id);
      if(result == ""){
        response.status(404).json({message: "error", info: "Ecopoint not found in our database."});
      } else {
        // hide id of user who added the ecopoint
        let resultWithOutId = result.shift();
        delete resultWithOutId.byuser;
        // Decodes the JSON to not come with "/"
        let locationOfResult = JSON.parse(resultWithOutId.location);
        delete resultWithOutId.location;
        Object.assign(resultWithOutId, {location: locationOfResult});
  
        response.status(200).json({message: "sucess", info: resultWithOutId});
      }
    } else {
      const [results] = await pool.query("SELECT * FROM ecopoints");
      // script to hide id of user who added the ecopoint
      let ecopoints = [];
      results.forEach(result => {
        delete result.byuser
        // Decodes the JSON to not come with "/"
        let locationOfResult = JSON.parse(result.location);
        delete result.location;
        Object.assign(result, {location: locationOfResult});
        ecopoints.push(result);
      });
      response.status(200).json({message: "sucess", info: ecopoints});
    }
  } catch(error){
    response.status(500).json({ message: "error", info: "Internal error." })
  }
});

// Create new ecopoint
router.post("/",
  [
    body('type').notEmpty().escape(),
    body('lat').notEmpty().escape(),
    body('long').notEmpty().escape()
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
            let location = JSON.stringify({lat: request.body.lat, long: request.body.long});
            let [result] = await pool.query(`INSERT INTO ecopoints VALUES (NULL, '${request.body.type}', '${location}', '${valid.id}')`);
            response.status(201).json({message: "sucess", info: "Ecopoint successfully added.", id: result.insertId});
          } else {
            response.status(403).json({message: "error", info: "Invalid token, please login again."});
          }
        } else {
          response.status(401).json({message: "error", info: "No token found to add ecopoint."});
        }
      } else {
        response.status(400).json({message: "error", info: "Bad Resquest. Please check the documentation of the API.", errors: errors.array()});
      }
    } catch(error){
      response.status(500).json({ message: "error", info: "Internal error." })
    }
});

// Update ecopoint
router.put("/",
  [
    body('type').notEmpty().escape(),
    body('lat').notEmpty().escape(),
    body('long').notEmpty().escape()
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
            if(request.query.id && request.query.id > 0){
              const [ecopointsDB] = await pool.query(`SELECT * FROM ecopoints WHERE id = "${request.query.id}"`);
              if(ecopointsDB == ""){
                response.status(404).json({message: "error", info: "Ecopoint not found in our database."});
              } else {
                let location = JSON.stringify({lat: request.body.lat, long: request.body.long});
                await pool.query(`UPDATE ecopoints SET type = '${request.body.type}', location = '${location}' WHERE id = '${request.query.id}'`);
                response.status(200).json({message: "sucess", info: "Ecopoint successfully updated."});
              }
            } else {
              response.status(400).json({message: "error", info: "Bad Resquest. Please check the documentation of the API."});
            }
          } else {
            response.status(403).json({message: "error", info: "Invalid token, please login again."});
          }
        } else {
          response.status(401).json({message: "error", info: "No token found to update ecopoint."});
        }
      } else {
        response.status(400).json({message: "error", info: "Bad Resquest. Please check the documentation of the API.", errors: errors.array()});
      }
    } catch(error){
      response.status(500).json({ message: "error", info: "Internal error." })
    }
});

// Delete ecopoint
router.delete("/", async (request, response) => {
  try {
    const bearerHeader = request.headers['authorization'];
    if(typeof bearerHeader !== "undefined"){
      const token = bearerHeader.split(' ')[1];
      const valid = await security.verify(token);
      if(valid){
        if(request.query.id && request.query.id > 0){
          const [ecopointsDB] = await pool.query(`SELECT * FROM ecopoints WHERE id = "${request.query.id}"`);
          if(ecopointsDB == ""){
            response.status(404).json({message: "error", info: "Ecopoint not found in our database."});
          } else {
            await pool.query(`DELETE FROM ecopoints WHERE id = '${request.query.id}'`);
            response.status(200).json({message: "sucess", info: "Ecopoint successfully deleted."});
          }
        } else {
          response.status(400).json({message: "error", info: "Bad Resquest. Please check the documentation of the API."});
        }
      } else {
        response.status(403).json({message: "error", info: "Invalid token, please login again."});
      }
    } else {
      response.status(401).json({message: "error", info: "No token found to update ecopoint."});
    }
  } catch(error){
    response.status(500).json({ message: "error", info: "Internal error." })
  }
});

// export routes
module.exports = router;