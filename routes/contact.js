const express = require('express');
const router = express.Router();
const pool = require("../database").pool;
const email = require('../functions/email');
const { body, validationResult } = require('express-validator');
const handle = require('../functions/errorHandling');
const { datetimeString } = require('firebase-tools/lib/utils');

// write contacts (when a user fills the contact form on the app)
router.post("/",
  [
    body('name').notEmpty().escape(),
    body('email').isEmail().escape(), 
    body('subject').notEmpty().escape(),
    body('message').notEmpty().escape(),
  ],
  async (request, response) => {
    const errors = validationResult(request);
    const date = new Date;
    if(errors.isEmpty()){
        // 
        await pool.query(`INSERT INTO contacts VALUES (NULL, '${request.body.name}', '${request.body.email}', '${request.body.subject}', '${request.body.message}', '${date}')`);
        // send email to notify admin
        email.send(4, "mail@raulcampos.net", "GeoGreen - Contact Notifier", "You have a new message", {fromUser: request.body.name, emailUser: request.body.email, subject: request.body.subject, message: request.body.message, time: {day: date.getDate(), month: date.getUTCMonth() + 1, year: date.getUTCFullYear(), hour: date.getHours(), minute: date.getMinutes()}});
        
        response.status(201).json({message: "sucess", info: "Message stored in the database."});
    } else {
      response.status(400).json({message: "error", info: "Bad Resquest. Please check the documentation of the API.", errors: errors.array()});
    }
    // catch some error
    handle.error();
})
// export routes
module.exports = router;