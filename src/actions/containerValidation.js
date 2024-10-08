const {MongoClient: mongoClient} = require("mongodb");
const axios = require('axios');

const containerValidation = {}

containerValidation.checkHttpReady = async (container, port) => {
    let attempts = 0;
    const maxAttempts = 10;
    const delay = 3000; // Delay in milliseconds between attempts

    const check = async () => {
        try {
            const url = "http://localhost:" + port;
            console.log(`Checking to see if URL is ready: ${url}`);
           await fetch(url);
            console.log(`HTTP Container ${container.containerName} is ready`);
        } catch (err) {
            attempts++;
            if (attempts >= maxAttempts) {
                throw new Error(`HTTP Dockerfile ${container.containerName} failed to start after max attempts`);
            }
            console.log(`HTTP Dockerfile ${container.containerName} not ready, retrying...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            await check();
        }
    };

    await check();
}
containerValidation.checkMongoDBReady = async (container) => {
    let attempts = 0;
    const maxAttempts = 10;
    const delay = 3000; // Delay in milliseconds between attempts

    const check = async () => {
        try {
            const client = await mongoClient.connect(
                'mongodb://localhost:27017',
                { useNewUrlParser: true, useUnifiedTopology: true }
            );
            await client.close();
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

    // Function to notify main service about completion
    async function notifyMainService(containerId, status) {
        axios.post('http://localhost:3000/notify', { containerId, status })
            .then(response => {
                console.log('Notification sent successfully');
            })
            .catch(error => {
                console.error('Error sending notification:', error);
            });
    }

// Call notifyMainService when job is completed
    await notifyMainService(container.containerName, 'checkMongoDBReady completed');
};

module.exports = containerValidation;