const { MongoMemoryServer } = require("mongodb-memory-server");
const mongoose = require("mongoose");

let mongoServer;

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri, { runtimeAdapters: { os: require('os') } });
  }
}, 60000);

afterEach(async () => {
  if (mongoose.connection.readyState !== 0) {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  }
});

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  if (mongoServer) {
    await mongoServer.stop();
  }
}, 60000);
