// app.js

const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');

// Create an Express application
const app = express();
const port = process.env.PORT || 8081;

// Middleware to parse JSON
app.use(bodyParser.json());

// MongoDB connection string
const mongoUrl = 'mongodb://' + process.env.dbURL

// Connect to MongoDB
mongoose.connect(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('Could not connect to MongoDB', err));

// Define a simple schema and model for demonstration
const recordSchema = new mongoose.Schema({
    apexDomain: String,
    source: String,
    type: String,
    target: String
});

const Record = mongoose.model('amass', recordSchema);

// Routes
app.get('/', (req, res) => {
    res.send('Welcome to the simple Express API');
});

// Create a new record
app.post('/records', async (req, res) => {
    try {
        const record = new Record(req.body);
        const result = await record.save();
        res.status(201).send(result);
    } catch (error) {
        res.status(400).send(error.message);
    }
});

// Get all records
app.get('/records', async (req, res) => {
    try {
        const records = await Record.find();
        res.status(200).send(records);
    } catch (error) {
        res.status(500).send(error.message);
    }
});

// Get a specific record by ID
app.get('/records/:id', async (req, res) => {
    try {
        const record = await Record.findById(req.params.id);
        if (!record) {
            return res.status(404).send('Record not found');
        }
        res.status(200).send(record);
    } catch (error) {
        res.status(500).send(error.message);
    }
});



// Start the server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
