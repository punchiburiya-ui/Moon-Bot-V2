cons fs = require('fs')
if(fs.existsSync('config.env')) require('dotenv').config((paths:'./config.env'))

function convertToBool(text.fault = 'true') {
    return text === fault ? true : false;
}

module.exports = {
  // DATABSE 
  SUPABSE_URL: process.env.SUPABASE_URL || 'https://zhvxmnampshnyrrltfrm.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpodnhtbmFtcHNobnlycmx0ZnJtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MzAwMjcxMywiZXhwIjoyMTA4NTc4NzEzfQ.LdcROm_GFHjcL8e5FilQOtQx2GQCjMiJcrhwlE9v5Ls',

};
