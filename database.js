const { MongoClient } = require('mongodb');
const { createClient } = require('redis');
let redisClient;
let db;

async function main() {
    redisClient = await connectToRedis();
    console.log('Connected to Redis');
    db = await connectToDB();
    console.log('Connected to MongoDB');
    // Set an interval for flushing data to MongoDB
    setInterval(() => {
        flushHitsToMongoDB(db).catch(console.error);
    }, 10000); // Flush every 10 seconds, adjust as necessary
}

async function connectToDB() {
    const user = process.env.MONGO_INITDB_ROOT_USERNAME;
    const password = process.env.MONGO_INITDB_ROOT_PASSWORD;
    const dbname = process.env.MONGO_INITDB_DATABASE;
    const uri = `mongodb://${user}:${password}@mongo:27017/${dbname}?authSource=admin`; // Replace with your MongoDB URI
    const client = new MongoClient(uri);
    await client.connect();
    return client.db(dbname);
}

async function connectToRedis() {
    // Redis連接邏輯...
    return createClient({ url: 'redis://redis:6379' }).connect();
}

async function pushData(data) {
    const key = 'hitEvents';
    await redisClient.rPush(key, JSON.stringify(data));
}
async function flushHitsToMongoDB(db) {
    const key = 'hitEvents';
    const records = await redisClient.lRange(key, 0, -1);
    const docs = records.map(JSON.parse);

    if (docs.length > 0) {
        const collection = db.collection(key);
        await collection.insertMany(docs);
        await redisClient.del(key);
    }
}

main().catch(console.error);

module.exports = { pushData };