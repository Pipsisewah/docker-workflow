// app.js
const { MongoClient } = require('mongodb');
const axios = require('axios');

async function checkGoogleConnectivity() {
    try {
        const response = await axios.get('https://www.google.com');
        if (response.status === 200) {
            console.log('Successfully connected to Google');
        } else {
            console.log('Failed to connect to Google');
        }
    } catch (error) {
        console.error('Error connecting to Google:', error);
    }
}
async function run() {
    console.log('Attempting to run the script');
    try {
        await checkGoogleConnectivity();
    } catch (err) {
        console.error(`Failed to communicate with google: ${err}`);
    }
}

run().catch(console.dir);
