// script.js

const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

// Function to process a single line
function processLine(line) {
    const parts = line.split('-->').map(part => part.replace(/\s*\(.*?\)\s*/g, '').trim());

    if (parts.length !== 3) {
        throw new Error('Line format is incorrect.');
    }

    const record = {
        apexDomain: process.env.apexDomain,
        source: parts[0],
        type: parts[1],
        target: parts[2]
    };

    return record;
}

// MongoDB connection details from environment variables
const url = process.env.MONGO_URL || 'mongodb://mongodb:27017';
const dbName = process.env.DB_NAME || 'test';

// Path to the input file
const inputFilePath = path.resolve('/data/scanlogs/amassresults.txt');

async function main() {
    // Read input from the file
    const inputString = fs.readFileSync(inputFilePath, 'utf8').trim();
    const lines = inputString.split('\n');

    // Process each line
    const records = lines.map(line => processLine(line));

    // Create a new MongoClient
    const client = new MongoClient(url);

    try {
        // Connect to the MongoDB cluster
        await client.connect();

        console.log('Connected to MongoDB');

        // Select the database
        const db = client.db(dbName);

        // Select the collection
        const collection = db.collection('amass');

        // Insert all records into the collection
        const result = await collection.insertMany(records);

        console.log('Records inserted:', result.insertedCount);
    } catch (err) {
        console.error('Error:', err);
    } finally {
        // Close the connection to the MongoDB cluster
        await client.close();
    }
}

// Run the main function
main().catch(console.error);
