const workflowComposer = require('./workflowComposer');
const { Machine, assign, sendParent, send, interpret} = require('xstate');
const dockerActions = require('./actions/dockerActions');
const containerValidation = require("./actions/containerValidation");
const express = require('./api/index');

let mainService;

startContainer = async (context, event, { action }) => {
    const container = context.containers.find(container => container.containerName === action.container)
    await dockerActions.startContainer(container);
    await verifyContainerServiceStarted(container);
    console.log('Container Started');
    mainService.send('NEXT')
}

verifyContainerServiceStarted = async (container) => {
    const portKey = Object.keys(container.ExposedPorts)[0];
    const port = portKey.split('/')[0];
    if(port === "27017") {
        console.log('Checking if MongoDB is ready');
        await containerValidation.checkMongoDBReady();
    }
}



const actions = {
    startContainer: assign(async (context, event, meta) => {
        await startContainer(context, event, meta);
    }),
};

const services = {};

async function main() {
    const expressServer = express.start(3000);
    const fullWorkflowDefinition = await workflowComposer.readWorkflow('secondWorkflow');
    console.log(JSON.stringify(fullWorkflowDefinition));
    const workflowDefinition = fullWorkflowDefinition.stateMachine;
    const testMachine = Machine(
        workflowDefinition,
        {
            actions,
            services
        }
    );
    mainService = interpret(testMachine)
        .onTransition((state) => {
            if (state.changed) {
                console.log(state.context.currentStateMeta);
            }
        })
        .onDone((context, event) => {
            console.log('State machine reached final state');
            expressServer.close()
        })
        .start();
}

main().then(() => {
    console.log('Main function completed!');
}).catch(error => {
    console.error('Error!, error');
});

