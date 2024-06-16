const fs = require('fs');
const util = require('util');
const {Machine, interpret, assign} = require("xstate");
const dockerActions = require("./actions/dockerActions");
const containerValidation = require("./actions/containerValidation");
const {volumeActions, networkActions, containerActions} = require("./actions/dockerActions");
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


createContainer = async (context, event, { action }) => {
    action.Env = context;
    const container = await dockerActions.containerActions.startContainer(action);
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
            // console.log(`Container ${action.containerName } has stopped:`, data);
            // container.remove((err, data) => {
            //     if (err) {
            //         console.error(`Error removing the container ${action.containerName }:`, err);
            //         return;
            //     }
            //     console.log(`Container ${action.containerName } removed:`, data);
            //     mainService.send('NEXT');
            // });
        });
    }
}



createNetwork = async (context, event, {action}) => {
    const networkInfo = await dockerActions.networkActions.getActiveNetworkInfo(action.networkName);
    if(!networkInfo) {
        await dockerActions.networkActions.createNetwork(action);
    }else{
        dockerActions.networkActions.trackNetwork(action, networkInfo);
    }
    mainService.send('NEXT');
}

createVolume = async (context, event, {action }) => {
    await dockerActions.volumeActions.createVolume(action);
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
            console.log('Running Cleanup');
            containerActions.cleanup().then(result  => {
                return volumeActions.cleanup().then(result => {
                    return networkActions.cleanup(containerActions.getContainers()).catch(error => {
                        console.error(`Failed to completely cleanup: ${error}`)
                    });
                })
            })


            console.log('Operation Complete');
            expressServer.close()

        })
        .start();
}




module.exports = workflowComposer;
