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
    const containerInfo = context.containers.find(container => container.containerName === action.container)
    const container = await dockerActions.startContainer(containerInfo, action.reuse);
    await verifyContainerServiceStarted(containerInfo);
    console.log('Container Started');
    if(action.static){
        mainService.send('NEXT');
    }else {
        container.wait((err, data) => {
            if (err) {
                console.error(`Error waiting for the container ${container.containerName }:`, err);
                return;
            }
            console.log(`Container ${containerInfo.containerName } has stopped:`, data);
            container.remove((err, data) => {
                if (err) {
                    console.error(`Error removing the container ${containerInfo.containerName }:`, err);
                    return;
                }
                console.log(`Container ${containerInfo.containerName } removed:`, data);
                mainService.send('NEXT');
            });
        });
    }
}

createVolume = async (context, event, {action }) => {
    await dockerActions.createVolume(action.Name);
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
    createVolume:  assign(async (context, event, meta) => {
        await createVolume(context, event, meta);
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
