const Docker = require('dockerode');
const {MongoClient: mongoClient} = require("mongodb");
const docker = new Docker();

const dockerActions = {};

dockerActions.pullImage =  async (imageName) => {
    return new Promise((resolve, reject) => {
        docker.pull(imageName, (err, stream) => {
            if (err) {
                reject(err);
                return;
            }
            docker.modem.followProgress(stream, (err, output) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(output);
            });
        });
    });
};

dockerActions.startContainer =  async (containerOptions) => {
    return new Promise((resolve, reject) => {
        docker.createContainer(containerOptions, (err, container) => {
            if (err) {
                reject(err);
                return;
            }
            container.start((err) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(container);
            });
        });
    });
};

dockerActions.checkMongoDBReady = async () => {
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
                throw new Error('MongoDB failed to start after max attempts');
            }
            console.log('MongoDB not ready, retrying...');
            await new Promise(resolve => setTimeout(resolve, delay));
            await check();
        }
    };

    await check();
};

dockerActions.connectAndInsertDocument =  async () => {
    console.log('Now in connectAndInsertDocument');
    console.log('Connecting to MongoDB');
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

module.exports = dockerActions;