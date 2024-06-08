// app.js
async function run() {
    const fs = require('fs');
    const data = fs.readFileSync('/data/shared/hello.txt', 'utf8');
    console.log('Data read by reader:', data);
}

run().catch(console.dir);
