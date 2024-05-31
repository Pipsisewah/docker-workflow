const workflowComposer = require('./workflowComposer');
const { Machine, assign, sendParent, send, interpret} = require('xstate');
const dockerActions = require('./actions/dockerActions');
const nginxActions = require("./actions/nginxActions");
const mainStateMachine = require("./stateMachines/main");

function startContainerFactory(containerName) {
    return {
        src: startContainer(containerName)
    }
}
async function pullImages(context) {
    for (const image of context.containers) {
        console.log(`Pulling image: ${image.name}`);
        await actions.pullImage(image.config.dockerImage);
    }
    console.log('Images have been pulled');
}

async function startContainer(context, event) {
    console.log(`Event ${JSON.stringify(context)}`);
    const container = context.containers[event.data.containerName];
    console.log(JSON.stringify(container));
    await actions.startContainer(container.config)
}



const actions = {
    startContainer: dockerActions.startContainer,
    pullImage: dockerActions.pullImage,
    updateMeta: assign({
        currentStateMeta: (context, event, meta) => meta.state.meta[meta.state.value]
    })
};

const services = {
    pullImages,
    startContainer
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

