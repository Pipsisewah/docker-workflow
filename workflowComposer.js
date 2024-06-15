const fs = require('fs');
const util = require('util');
const {Machine, interpret, assign} = require("xstate");
const dockerActions = require("./actions/dockerActions");
const containerValidation = require("./actions/containerValidation");
const workflowComposer = {};
const readFileAsync = util.promisify(fs.readFile);
let mainService;
const volumes = [];
const networks = [];


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


createContainer = async (context, event, { action }) => {
    action.Env = context;
    const container = await dockerActions.containerActions.createContainer(action);
    await verifyContainerServiceStarted(action);
    console.log('Container Started');
    if(!action.await){
        mainService.send('NEXT');
    }else {
        container.wait((err, data) => {
            if (err) {
                console.error(`Error waiting for the container ${container.containerName }:`, err);
                return;
            }
            console.log(`Container ${action.containerName } has stopped:`, data);
            container.remove((err, data) => {
                if (err) {
                    console.error(`Error removing the container ${action.containerName }:`, err);
                    return;
                }
                console.log(`Container ${action.containerName } removed:`, data);
                mainService.send('NEXT');
            });
        });
    }
}



createNetwork = async (context, event, {action}) => {
    if(! await dockerActions.networkActions.doesNetworkExist(action.networkName)) {
        await dockerActions.networkActions.createNetwork(action);
    }
    console.log('Calling Next');
    mainService.send('NEXT');
}

createVolume = async (context, event, {action }) => {
    const createdVolume  = await dockerActions.volumeActions.createVolume(action.Name);
    volumes.push({
        name: action.Name,
        persist: action.persist,
        volume: createdVolume
    });
    mainService.send('NEXT');
}

verifyContainerServiceStarted = async (container) => {
    if(container.ExposedPorts) {
        const portKey = Object.keys(container.ExposedPorts)[0];
        const port = portKey.split('/')[0];
        if (port === "27017") {
            console.log('Checking if MongoDB is ready');
            await containerValidation.checkMongoDBReady(container);
        }
        if (port === "8080") {
            console.log('Would attempt to verify via HTTP');
        }
    }

}

const actions = {
    createContainer: assign(async (context, event, meta) => {
        await createContainer(context, event, meta);
    }),
    createVolume:  assign(async (context, event, meta) => {
        await createVolume(context, event, meta);
    }),
    createNetwork:  assign(async (context, event, meta) => {
        await createNetwork(context, event, meta);
    }),
};

const services = {};

workflowComposer.createAndRunWorkflow = (workflowDefinition, expressServer, envVariables) => {
    workflowDefinition.context = envVariables;
    const workflowMachine = Machine(
        workflowDefinition,
        {
            actions,
            services
        }
    );
    console.log(`apexDomain ${JSON.stringify(envVariables)}`);
    console.log(`workflowMachine.context ${JSON.stringify(workflowMachine.context)}`);
    mainService = interpret(workflowMachine)
        .onTransition((state) => {})
        .onDone((context, event) => {
            if(volumes.length > 0){
                console.log('Cleaning up open volumes');
                for (const attachedVolume of volumes){
                    if(!attachedVolume.persist){
                        try {
                            attachedVolume.volume.remove();
                            console.log(`Volume ${attachedVolume.name} delete`);
                        }catch (err) {
                            console.error(`Unable to delete volume! ${attachedVolume.name}  ${err}`);
                        }
                    }
                }
            }
            console.log('Operation Complete');
            expressServer.close()

        })
        .start();
}




module.exports = workflowComposer;
