const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let memoryServer;

async function connectDb() {
  let uri = process.env.MONGODB_URI;

  if (!uri || uri.trim() === '') {
    memoryServer = await MongoMemoryServer.create({
      instance: {
        launchTimeout: 60000,
      },
    });
    uri = memoryServer.getUri('agendate');
    console.log('[db] Using in-memory MongoDB for demo');
  } else {
    console.log('[db] Connecting to', uri.replace(/\/\/.*@/, '//***@'));
  }

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 15000,
    });
    console.log('[db] Connected');
  } catch (err) {
    console.error('[db] Connection failed:', err.message);
    if (/whitelist|IP|ENOTFOUND|querySrv|authentication/i.test(err.message)) {
      console.error(
        '[db] Tip: In Atlas → Network Access, allow 0.0.0.0/0. Also check user/password in MONGODB_URI.'
      );
    }
    throw err;
  }
}

module.exports = { connectDb };
