const workflowComposer = require('./workflowComposer');
const { Machine, assign, sendParent, send, interpret} = require('xstate');
const dockerActions = require('./actions/dockerActions');
const nginxActions = require("./actions/nginxActions");
const mainStateMachine = require("./stateMachines/main");
require('./api/index');

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
    const containerConfig = {
        t: container.config.containerName, // Tag for the image
        Image: container.config.dockerImage,
        ExposedPorts: container.config.exposedPorts,
        HostConfig: container.config.HostConfig
    };
    console.log(`Container Config ${JSON.stringify(containerConfig)}`);
    await dockerActions.startContainer(containerConfig)
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
    const interpreter = interpret(testMachine)
        .onTransition((state) => {
            if (state.changed) {
                console.log(state.context.currentStateMeta);
            }
        })
        .start();
}

main().then(() => {
    console.log('Main function completed!');
}).catch(error => {
    console.error('Error!, error');
});

