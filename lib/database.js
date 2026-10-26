const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const config = require('../settings');
const ws = require('ws'); // 1. ws package එක මෙතැනින් import කරගන්නා ලදී

const databaseFolder = path.join(__dirname, 'database');
if (!fs.existsSync(databaseFolder)) fs.mkdirSync(databaseFolder);

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://tdriaqusmojhppvdqepw.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkcmlhcXVzbW9qaHBwdmRxZXB3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDcyMzgzNSwiZXhwIjoyMDkwMjk5ODM1fQ.TEgvcT7JN-hKJwAiGpBkhm8CAixyxltZsZ7wFBqqZ1c';

// 2. createClient එකට realtime config එක ලෙස ws ලබා දෙන ලදී
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  realtime: {
    transport: ws
  }
});

const defaultSettings = {
    BOT_MODE: "public",
    WORK_TYPE: "public",
    AUTO_VIEW_STATUS: "true",
    AUTO_LIKE_STATUS: "true",
    ANTI_DELETE: 'off',
    ANTI_DELETE_MODE: 'dm',
    AUTO_READ_MESSAGE: 'off',
    ANTI_CALL: 'off',
    AUTO_RECORDING: "false",
    AUTO_TYPING: "true",
    ALWAYS_ONLINE: "false",
    PREFIX: ".",
    AUTO_LIKE_EMOJI: "",
    CUSTOM_REACT_EMOJI: "",
    STATUS_REPLY_TEXT: "",
    ANTI_LINK: "false",
    ANTI_BOT: "false",
    BUTTON: "false",
    CHAT_BOT: "false",
    AUTO_STATUS_REPLY: "off",
    WELCOME_MSG: "off",
    AUTO_BIO: "off",
    MAX_RETRIES: "3",
    BOT_FOOTER: "*● ʜᴀɴꜱᴀᴍᴀʟ x ᴍɪɴɪ ʙᴏᴛ ᴄʀᴇᴀᴛᴇᴅ ʙʏ ᴍʀ.ʜᴀɴꜱᴀᴍᴀʟ ᴀɴᴅ ᴍʀ.ʜᴀɴꜱᴀᴍᴀʟᴀ ●*",
    IMAGE_PATH: "https://raw.githubusercontent.com/hansamal-200/CONNECT-MSG/refs/heads/main/2d0bce1f-5755-450a-800f-cfe6e7142da8.png",
    LANG: "EN"
};

async function connectdb() {
  try {
    const { error } = await supabase.from('user_settings').select('NUMBER').limit(1);
    if (error && error.code !== '42P01') { 
      throw error; 
    }
    console.log("Supabase Database connected 🛢️");
  } catch (error) {
    console.error(" ├ Supabase database connection error:", error.message);
  }
}

async function ensureUser(number) {
  const sanitized = number.replace(/[^0-9]/g, '');
  
  const { data, error } = await supabase
    .from('user_settings')
    .select('NUMBER')
    .eq('NUMBER', sanitized)
    .maybeSingle(); 
  if (!data) {
    const { error: insertError } = await supabase
      .from('user_settings')
      .insert([{ NUMBER: sanitized, ...defaultSettings }]);
      
    if (insertError) {
      console.error("❌ Error creating user:", insertError.message);
    } else {
      console.log("✅ New user settings created for " + sanitized);
    }
  }
  return sanitized;
}

async function input(setting, data, number) {
  if (!number) { console.error("input() — number missing!"); return; }
  const sanitized = await ensureUser(number);
  
  const { error } = await supabase
    .from('user_settings')
    .update({ [setting]: data })
    .eq('NUMBER', sanitized);

  if (error) {
    console.error(`❌ Error updating ${setting}:`, error.message);
  }
}

async function get(setting, number) {
  if (!number) { console.error("get() — number missing!"); return null; }
  const sanitized = number.replace(/[^0-9]/g, '');
  
  const { data, error } = await supabase
    .from('user_settings')
    .select(setting)
    .eq('NUMBER', sanitized)
    .maybeSingle();
    
  return data ? data[setting] : null;
}

async function getalls(number) {
  if (!number) return null;
  const sanitized = number.replace(/[^0-9]/g, '');
  
  const { data, error } = await supabase
    .from('user_settings')
    .select('*')
    .eq('NUMBER', sanitized)
    .maybeSingle();
    
  return data || null;
}

async function updb(number) {
  if (!number) return;
  const sanitized = number.replace(/[^0-9]/g, '');
  
  const { data, error } = await supabase
    .from('user_settings')
    .select('*')
    .eq('NUMBER', sanitized)
    .maybeSingle();
    
  if (data) {
    delete data.id; 
    delete data.NUMBER;
    Object.assign(config, data);
    console.log("Database updated for " + sanitized + " ✅");
  }
}

async function updfb(number) {
  if (!number) return;
  const sanitized = number.replace(/[^0-9]/g, '');
  
  await supabase
    .from('user_settings')
    .delete()
    .eq('NUMBER', sanitized);
    
  await ensureUser(sanitized);
  console.log(`Settings reset for ${sanitized} ✅`);
}

async function updateCMDStore(MsgID, CmdID) {
  try {
    const filePath = path.join(databaseFolder, 'data.json');
    const olds = fs.existsSync(filePath) ? await readJsonFile(filePath) : [];
    const filtered = olds.filter(item => !item[MsgID]);
    filtered.push({ [MsgID]: CmdID });
    await writeJsonFile(filePath, filtered);
    return true;
  } catch (e) { console.log("Error updating command store:", e); return false; }
}

async function isbtnID(MsgID) {
  try {
    const filePath = path.join(databaseFolder, 'data.json');
    const olds = fs.existsSync(filePath) ? await readJsonFile(filePath) : [];
    return olds.some(item => item[MsgID]);
  } catch (e) { return false; }
}

async function getCMDStore(MsgID) {
  try {
    const filePath = path.join(databaseFolder, 'data.json');
    const olds = fs.existsSync(filePath) ? await readJsonFile(filePath) : [];
    const foundItem = olds.find(item => item[MsgID]);
    return foundItem ? foundItem[MsgID] : null;
  } catch (e) { console.log("Error retrieving command store:", e); return null; }
}

async function upresbtn() {
  await writeJsonFile(path.join(databaseFolder, 'data.json'), []);
  console.log(" ├ Command store reset ✅");
}

function getCmdForCmdId(CMD_ID_MAP, cmdId) {
  const result = CMD_ID_MAP.find(entry => entry.cmdId === cmdId);
  return result ? result.cmd : null;
}

async function readJsonFile(filePath) {
  return new Promise((resolve) => {
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) return resolve([]);
      try { resolve(JSON.parse(data || "[]")); } catch { resolve([]); }
    });
  });
}

async function writeJsonFile(filePath, data) {
  return new Promise((resolve, reject) => {
    fs.writeFile(filePath, JSON.stringify(data, null, 2), (err) => {
      if (err) reject(err); else resolve(true);
    });
  });
}

module.exports = {
  connectdb,
  ensureUser,
  input,
  get,
  getalls,
  updb,
  updfb,
  updateCMDStore,
  isbtnID,
  getCMDStore,
  upresbtn,
  getCmdForCmdId,
};
