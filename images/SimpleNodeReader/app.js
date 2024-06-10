// app.js

const axios = require("axios");

function notifyMainService(containerId, status) {
    axios.post('http://host.docker.internal:3000/notify', {containerId, status})
        .then(response => {
            console.log('Notification sent successfully');
        })
        .catch(error => {
            console.error('Error sending notification:', error);
        });
}

async function run() {
    const fs = require('fs');
    const data = fs.readFileSync('/data/shared/hello.txt', 'utf8');
    console.log('Data read by reader:', data);
    notifyMainService(`Reader read this data: ${data}`, 200);
}

run().catch(console.dir);
