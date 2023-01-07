// require/import modules and configuration
const bcrypt = require("bcrypt");

// function to hash some Password
async function hashPassword(password, rounds){
    const hash = await bcrypt.hash(password, rounds);
    return hash;
}
// export functions
module.exports = { hashPassword }
