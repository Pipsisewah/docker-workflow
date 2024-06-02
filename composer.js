const workflowComposer = require('./workflowComposer');
const { Machine, assign, sendParent, send, interpret} = require('xstate');
const dockerActions = require('./actions/dockerActions');
const nginxActions = require("./actions/nginxActions");
const mainStateMachine = require("./stateMachines/main");
const express = require('./api/index');

let mainService;

async function pullImages(context) {
    for (const image of context.containers) {
        console.log(`Pulling image: ${image.name}`);
        await actions.pullImage(image.config.dockerImage);
    }
    console.log('Images have been pulled');
}

startContainer = async (context, event, { action }) => {
    console.log(`Event ${JSON.stringify(action.container)}`);
    const container = context.containers.find(container => container.name === action.container)
    console.log(JSON.stringify(container));
    //dockerfile: container.config.dockerFileName,
    const containerConfig = {
        t: container.name,
        name: container.name,
        Image: container.config.dockerImage,
        ExposedPorts: container.config.exposedPorts,
        HostConfig: container.config.HostConfig,
        buildargs: container.config.arguments,
    };
    console.log(`Container Config ${JSON.stringify(containerConfig)}`);
    await dockerActions.startContainer(containerConfig);
    await verifyContainerServiceStarted(container);
    console.log('Container Started');
    mainService.send('NEXT')
}

verifyContainerServiceStarted = async (container) => {
    const portKey = Object.keys(container.config.exposedPorts)[0];
    const port = portKey.split('/')[0];
    if(port === "27017") {
        console.log('Checking if MongoDB is ready');
        await nginxActions.checkMongoDBReady();
    }
}



const actions = {
    startContainer: assign(async (context, event, meta) => {
        await startContainer(context, event, meta);
    }),
    pullImage: dockerActions.pullImage,
};

const services = {
    pullImages,
};

async function main() {
    const expressServer = express.start(3000);
    const fullWorkflowDefinition = await workflowComposer.readWorkflow('secondWorkflow');
    console.log(JSON.stringify(fullWorkflowDefinition));
    const workflowDefinition = fullWorkflowDefinition.stateMachine;
    const requiredDockerImages = fullWorkflowDefinition.containers;

    //await pullImages(requiredDockerImages);
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

