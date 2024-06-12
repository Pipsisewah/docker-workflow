const workflowComposer = require('./workflowComposer');
const express = require('./api/index');

async function main() {
    const expressServer = express.start(3000);
    const workflowDefinition = await workflowComposer.readWorkflow('recon');
    workflowComposer.createAndRunWorkflow(workflowDefinition, expressServer);
}

main().then(() => {
    console.log('Main function completed!');
}).catch(error => {
    console.error(`Error!, ${error}`);
});

