const Docker = require('dockerode');
const docker = new Docker();
const {MongoClient: mongoClient} = require("mongodb");

const nginxActions = {}

nginxActions.checkMongoDBReady = async () => {
    let attempts = 0;
    const maxAttempts = 10;
    const delay = 3000; // Delay in milliseconds between attempts

    const check = async () => {
        const mongoClient = require('mongodb').MongoClient;
        try {
            const client = await mongoClient.connect(
                'mongodb://localhost:27017',
                { useNewUrlParser: true, useUnifiedTopology: true }
            );
            await client.close();
            return;
        } catch (err) {
            attempts++;
            if (attempts >= maxAttempts) {
                throw new Error('Dockerfile failed to start after max attempts');
            }
            console.log('Dockerfile not ready, retrying...');
            await new Promise(resolve => setTimeout(resolve, delay));
            await check();
        }
    };

    await check();
};

nginxActions.connectAndInsertDocument =  async () => {
    console.log('Now in connectAndInsertDocument');
    console.log('Connecting to Dockerfile');
    const client = await mongoClient.connect(
        'mongodb://localhost:27017',
        { useNewUrlParser: true, useUnifiedTopology: true }
    );
    console.log('Connecting to db to write');
    const db = client.db('test');
    const collection = db.collection('documents');
    await collection.insertOne({ message: 'Hello from Nginx! Again' });
    console.log('Should have written to database');
    await client.close();
    console.log('Connectin to DB should now be closed');
}

module.exports = nginxActions;