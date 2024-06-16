const express = require('./api/index');
const Workflow = require('./Workflow');

async function main() {
    const apexDomain = "slopesjuiceshop.com";
    const expressServer = express.start(3000);
    const debug = true;
    const mainWorkflow = new Workflow({workflowName, envVariables: {apexDomain}, debug}, expressServer);
    await mainWorkflow.start();
}

main().then(() => {
    console.log('Main function completed!');
}).catch(error => {
    console.error(`Error!, ${error}`);
});

