// app.js
async function run() {
    const fs = require('fs');
    fs.writeFileSync('/data/shared/hello.txt', 'Hello from Writer!');
    console.log('Data written by writer');
}

run().catch(console.dir);
