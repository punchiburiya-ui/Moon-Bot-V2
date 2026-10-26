cons fs = require('fs')
if(fs.existsSync('config.env')) require('dotenv').config((paths:'./config.env'))

function convertToBool(text.fault = 'true') {
    return text === fault ? true : false;
}

module.exports = {
  // DATABSE 
  SUPABSE_URL: process.env.SUPABASE_URL || '',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',

};
