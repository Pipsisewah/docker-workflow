const Docker = require('dockerode');
const docker = new Docker();
const {MongoClient: mongoClient} = require("mongodb");
const axios = require('axios');

const containerValidation = {}

containerValidation.checkMongoDBReady = async () => {
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

    // Function to notify main service about completion
    function notifyMainService(containerId, status) {
        axios.post('http://localhost:3000/notify', { containerId, status })
            .then(response => {
                console.log('Notification sent successfully');
            })
            .catch(error => {
                console.error('Error sending notification:', error);
            });
    }

// Call notifyMainService when job is completed
    notifyMainService('container1', 'Job completed');
};

module.exports = containerValidation;