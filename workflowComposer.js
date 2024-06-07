const fs = require('fs');
const util = require('util');
const {Machine, interpret, assign} = require("xstate");
const dockerActions = require("./actions/dockerActions");
const containerValidation = require("./actions/containerValidation");
const workflowComposer = {};
const readFileAsync = util.promisify(fs.readFile);
let mainService;

workflowComposer.readWorkflow = async (workflowName) => {
    const workflowPath = './workflows/' + workflowName + '.json';
    try {
        const data = await readFileAsync(workflowPath);
        const jsonData = JSON.parse(data.toString());
        return jsonData.stateMachine;
    } catch (error) {
        console.error('An error occurred:', error);
        throw error; // Re-throw the error to handle it outside the function if needed
    }
}

startContainer = async (context, event, { action }) => {
    const container = context.containers.find(container => container.containerName === action.container)
    await dockerActions.startContainer(container);
    await verifyContainerServiceStarted(container);
    console.log('Container Started');
    mainService.send('NEXT');
}

verifyContainerServiceStarted = async (container) => {
    const portKey = Object.keys(container.ExposedPorts)[0];
    const port = portKey.split('/')[0];
    if(port === "27017") {
        console.log('Checking if MongoDB is ready');
        await containerValidation.checkMongoDBReady(container);
    }
    if(port === "8080"){
        console.log('Would attempt to verify via HTTP');
    }

}

const actions = {
    startContainer: assign(async (context, event, meta) => {
        await startContainer(context, event, meta);
    }),
};

const services = {};

workflowComposer.createAndRunWorkflow = (workflowDefinition, expressServer) => {
    const workflowMachine = Machine(
        workflowDefinition,
        {
            actions,
            services
        }
    );
    mainService = interpret(workflowMachine)
        .onTransition((state) => {})
        .onDone((context, event) => {
            console.log('Operation Complete');
            expressServer.close()
        })
        .start();
}




module.exports = workflowComposer;
