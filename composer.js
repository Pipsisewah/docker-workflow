const workflowComposer = require('./workflowComposer');
const express = require('./api/index');
const Workflow = require('./Workflow');

async function main() {
    const workflowName = 'flowTest';
    const apexDomain = "slopesjuiceshop.com:3000";
    const expressServer = express.start(3000);
    const mainWorkflow = new Workflow({workflowName, envVariables: {apexDomain}}, expressServer);
    await mainWorkflow.start();
    //const workflowDefinition = await workflowComposer.readWorkflow(workflowName);
    //workflowComposer.createAndRunWorkflow(workflowDefinition, {apexDomain: apexDomain}, workflowName, expressServer);
}

main().then(() => {
    console.log('Main function completed!');
}).catch(error => {
    console.error(`Error!, ${error}`);
});

