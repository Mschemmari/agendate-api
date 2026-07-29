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

  await mongoose.connect(uri);
  console.log('[db] Connected');
}

module.exports = { connectDb };
