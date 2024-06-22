const dockerActions = require("./actions/dockerActions");
const {send, assign, Machine, interpret, sendParent} = require("xstate");
const containerValidation = require("./actions/containerValidation");
const util = require("util");
const fs = require("fs");
const {containerActions, volumeActions, networkActions} = require("./actions/dockerActions");
const readFileAsync = util.promisify(fs.readFile);

class Workflow {
    constructor({workflowName, parentWorkflow, envVariables}, expressServer) {
        this.workflowName = workflowName;
        this.parentWorkflow = parentWorkflow;
        this.envVariables = envVariables;
        this.expressServer = expressServer;
    }

    activeWorkflow = null;
    containers = [];
    networks = [];
    volumes = [];

    start = async () => {
        console.log(`Starting Workflow ${this.workflowName}`);
        const workflowDefinition = await this.readWorkflow(this.workflowName);
        await this.createAndRunWorkflow(workflowDefinition, this.envVariables, this.workflowName, this.expressServer);
    }

    readWorkflow = async (workflowName) => {
        const workflowPath = './projects/' + workflowName + '/workflow.json';
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
        const container = await dockerActions.containerActions.startContainer(action, this.workflowName);
        this.trackContainer(action);
        await this.verifyContainerServiceStarted(action);
        console.log('Container Started');
        if(!action.await){
            this.activeWorkflow.send('NEXT');
        }else {
            container.wait((err, data) => {
                if (err) {
                    console.error(`Error waiting for the container ${container.containerName }:`, err);
                    return;
                }
                this.activeWorkflow.send('NEXT');
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



    runWorkflow = async (context, event, {action}) => {
        console.log(`Attempting to run Workflow ${action.workflowName}`);
        const childWorkflow = new Workflow({workflowName: action.workflowName, parentWorkflow: this.activeWorkflow, envVariables: this.envVariables}, null);
        await childWorkflow.start();
        // const workflowDefinition = await this.readWorkflow(action.workflowName);
        // this.createAndRunWorkflow(workflowDefinition, context, action.workflowName, null);
    }


    createNetwork = async (context, event, {action}) => {
        const networkInfo = await dockerActions.networkActions.getActiveNetworkInfo(action.networkName);
        if(!networkInfo) {
            const networkInfo = await dockerActions.networkActions.createNetwork(action);
            this.trackNetwork(networkInfo)
        }else{
            this.trackNetwork(networkInfo);
        }
        this.activeWorkflow.send('NEXT');
    }

    createVolume = async (context, event, {action }) => {
        const volume = await dockerActions.volumeActions.createVolume(action);
        this.trackVolume(volume);
        this.activeWorkflow.send('NEXT');
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

    actions = {
        createContainer: assign(async (context, event, meta) => {
            await this.createContainer(context, event, meta);
        }),
        createVolume:  assign(async (context, event, meta) => {
            await this.createVolume(context, event, meta);
        }),
        createNetwork:  assign(async (context, event, meta) => {
            await this.createNetwork(context, event, meta);
        }),
        runWorkflow:  assign(async (context, event, meta) => {
            await this.runWorkflow(context, event, meta);
        }),
    };

    services = {};

    createAndRunWorkflow = (workflowDefinition, envVariables, workflowName, expressServer=null, parentWorkflow=null) => {
        workflowDefinition.context = {...envVariables, workflowName, parentWorkflow};
        const workflowMachine = Machine(
            workflowDefinition,
            {
                actions: this.actions,
                services: this.services
            }
        );
        console.log(`apexDomain ${JSON.stringify(envVariables)}`);
        console.log(`workflowMachine.context ${JSON.stringify(workflowMachine.context)}`);
        return new Promise((resolve, reject) => {
            this.activeWorkflow = interpret(workflowMachine)
                .onTransition((state) => {
                })
                .onDone(async (context, event) => {
                    console.log(`Running Cleanup on ${this.workflowName}`);
                    await this.cleanup();
                    await volumeActions.cleanup(this.volumes);
                    await networkActions.cleanup(this.networks, this.containers);
                    console.log(`Operation Complete ${JSON.stringify(context)}`);
                    if(expressServer){
                        expressServer.close()
                    }
                    if(this.parentWorkflow){
                        this.parentWorkflow.send('NEXT');
                    }
                })
                .start();
        });
    }

    cleanup = async () => {
        const containersDeepCopy = JSON.parse(JSON.stringify(this.containers));
        for (const containerObj of containersDeepCopy) {
            try {
                console.log(`Cleaning up ${containerObj.containerName}`);
                const container = await containerActions.getContainer(containerObj.containerName);
                if(!containerObj.sustain) {
                    await containerActions.stopContainer(container, containerObj);
                    await containerActions.removeContainer(container, containerObj);
                    const containerIndex = this.containers.findIndex(obj => obj.containerName === containerObj.containerName);
                    if(containerIndex !== -1){
                        this.containers.splice(containerIndex, 1);
                    }
                }
            } catch (err) {
                console.error(err);
            }
        }
    }

    trackContainer = (container) => {
        this.containers.push(container);
    }

    trackNetwork = (networkInfo) => {
        this.networks.push(networkInfo);
    }

    trackVolume = (volume) => {
        this.volumes.push(volume);
    }
}

module.exports = Workflow;