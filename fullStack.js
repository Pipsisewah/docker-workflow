const Docker = require('dockerode');
const { Machine, assign, sendParent, send } = require('xstate');
const mongoClient = require('mongodb').MongoClient;
// Create a Docker instance
const docker = new Docker();
const mongoServices = require('./services/mongodb');
const mainStateMachine = require('./stateMachines/main');
const dockerActions = require('./actions/dockerActions');
const nginxActions = require('./actions/nginxActions');
require('./api/index');


async function pullImages() {
    await actions.pullImage('mongo:latest');
    await actions.pullImage('nginx:latest');
    console.log('Images have been pulled');
}

async function startNginx() {
    const nginxContainerOptions = {
        t: 'nginx', // Tag for the image
        Image: 'nginx:latest',
        ExposedPorts: { '80/tcp': {} },
        HostConfig: {
            PortBindings: { '80/tcp': [{ HostPort: '8080' }] },
            Links: ['my_mongodb_container:db']
        }
    };
    return actions.startContainer(nginxContainerOptions);
}

// Define machine actions
const actions = {
    pullImage: dockerActions.pullImage,
    startContainer: dockerActions.startContainer,
    checkMongoDBReady: nginxActions.checkMongoDBReady,
    connectAndInsertDocument: nginxActions.connectAndInsertDocument,
};

const services = {
    pullImages,
    startMongoDB: mongoServices.startMongoDB,
    startNginx,
    checkMongoDBReady: actions.checkMongoDBReady,
    connectAndInsertDocument: actions.connectAndInsertDocument
}

// Define the Dockerode script execution machine
const dockerScriptMachine = Machine(
    mainStateMachine,
    {
        actions,
        services,
    }
);

// Usage:

const { interpret } = require('xstate');

// Create an interpreter for the machine
const interpreter = interpret(dockerScriptMachine)
    .onTransition(state => console.log('Current state:', state.value))
    .start();

interpreter.onTransition(state => {
    console.log('Transitioned to:', state.value);

    // Check if the machine has reached the final state
    if (state.done) {
        console.log('Machine is in a "done" state.');
    }
})

// Start the interpreter
interpreter.send('START');
