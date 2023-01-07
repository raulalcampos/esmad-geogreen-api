// require/import modules and configuration
const pool = require("../database").pool;
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
dotenv.config();

// function to hash a password
async function hashPassword(password, rounds){
    const hash = await bcrypt.hash(password, rounds);
    return hash;
}

// function to hash compare passwords
async function compare(passwordInsert, passwordDB){
    const response = await bcrypt.compare(passwordInsert, passwordDB);
    return response;
}

// function to generate a token
async function generate(info, time){
    const token = await jwt.sign(info, process.env.ACCESS_TOKEN_SECRET, { expiresIn: time });
    return token;
}

// function to verify a token
async function verify(token){
    const [tokenDB] = await pool.query(`SELECT * FROM invalidtokens WHERE token = "${token}"`);
    let auth;
    if(tokenDB == 0){
        jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decode) => {
            if(error){
                auth = false 
            } else if(decode){
                auth = decode;
            }
        });
    } else {
        auth = false   
    }
    return auth;
}

// export functions
module.exports = { hashPassword, compare, generate, verify }
