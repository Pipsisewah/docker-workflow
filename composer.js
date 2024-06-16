const workflowComposer = require('./workflowComposer');
const express = require('./api/index');

async function main() {
    const apexDomain = "slopesjuiceshop.com";
    const expressServer = express.start(3000);
    const workflowDefinition = await workflowComposer.readWorkflow('juice');
    workflowComposer.createAndRunWorkflow(workflowDefinition, expressServer, {apexDomain: apexDomain});
}

main().then(() => {
    console.log('Main function completed!');
}).catch(error => {
    console.error(`Error!, ${error}`);
});

