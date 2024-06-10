const workflowComposer = require('./workflowComposer');
const { Machine, assign, sendParent, send, interpret} = require('xstate');
const dockerActions = require('./actions/dockerActions');
const containerValidation = require("./actions/containerValidation");
const express = require('./api/index');











async function main() {
    const expressServer = express.start(3000);
    const workflowDefinition = await workflowComposer.readWorkflow('secondWorkflow');
    workflowComposer.createAndRunWorkflow(workflowDefinition, expressServer);
}

main().then(() => {
    console.log('Main function completed!');
}).catch(error => {
    console.error(`Error!, ${error}`);
});

