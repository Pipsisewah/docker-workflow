const fs = require('fs');
const util = require('util');
const {Machine, interpret, assign} = require("xstate");
const dockerActions = require("./actions/dockerActions");
const containerValidation = require("./actions/containerValidation");
const workflowUtils = require("./workflowUtils");
const workflowComposer = {};
const readFileAsync = util.promisify(fs.readFile);
let mainService;
const volumes = [];


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
    const containerInfo = workflowUtils.findContainerContext(context, action);
    const networkInfo = workflowUtils.findNetworkContext(context, containerInfo.networkName)
    console.info(`Network Info ${networkInfo}`);
    const container = await dockerActions.startContainer(containerInfo, action.reuse, networkInfo);
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
    const createdVolume  = await dockerActions.createVolume(action.Name);
    volumes.push({
        name: action.Name,
        persist: action.persist,
        volume: createdVolume
    });
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
