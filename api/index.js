const express = require('express');
const app = express();
const bodyParser = require('body-parser');

app.use(bodyParser.json());

const server = {};

// API endpoint to receive notifications from containers
app.post('/notify', (req, res) => {
    const { containerId, status } = req.body;
    console.log(`Received notification from container ${containerId}: ${status}`);
    res.sendStatus(200);
});

server.start = (port) => {
    return app.listen(port, () => {
        console.log('Main service listening on port 3000');
    });
}

module.exports = server;
