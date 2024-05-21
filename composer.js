const workflowComposer = require('./workflowComposer');
const { Machine, assign, sendParent, send, interpret} = require('xstate');
const dockerActions = require('./actions/dockerActions');
const nginxActions = require("./actions/nginxActions");
const mainStateMachine = require("./stateMachines/main");

async function pullImages(images) {
    for (const image of images) {
        console.log(`Pulling image: ${image}`);
        await actions.pullImage(image);
    }
    console.log('Images have been pulled');
}




const actions = {
    pullImage: dockerActions.pullImage,
    startContainer: dockerActions.startContainer,
};

const services = {};


const dockerScriptMachine = Machine(
    mainStateMachine,
    {
        actions,
        services,
    }
);

function compileListOfRequiredImages(workflow) {
    return workflow
        .filter(step => step.type === 'container')
        .map(step => step.config.dockerImage);
}

async function main() {
    const workflowDefinition = await workflowComposer.readWorkflow('firstWorkflow');
    console.log(JSON.stringify(workflowDefinition));
    const requiredDockerImages = compileListOfRequiredImages(workflowDefinition.workflow);
    await pullImages(requiredDockerImages);
    const testMachine = Machine(
        workflowDefinition,
        {
            actions,
            services
        }
    );
    const interpreter = interpret(testMachine)
        .onTransition(state => console.log('Current state:', state.value))
        .start();
}

main().then(() => {
    console.log('Main function completed!');
}).catch(error => {
    console.error('Error!, error');
});

