const dockerActions = require("./actions/dockerActions");
const {send, assign, Machine, interpret, sendParent} = require("xstate");
const containerValidation = require("./actions/containerValidation");
const util = require("util");
const fs = require("fs");
const path = require("path");
const {containerActions, volumeActions, networkActions} = require("./actions/dockerActions");
const readFileAsync = util.promisify(fs.readFile);


class Workflow {
    constructor({workflowName, parentWorkflow, envVariables, source}, expressServer) {
        this.workflowName = workflowName;
        this.parentWorkflow = parentWorkflow;
        this.envVariables = envVariables;
        this.expressServer = expressServer;
        this.source = source ? (source + "/" + workflowName) : undefined;
    }

    activeWorkflow = null;
    containers = [];
    networks = [];
    volumes = [];

    start = async () => {
        console.log(`Starting Workflow ${this.workflowName}`);
        const workflowDefinition = await this.readWorkflow(this.workflowName);
        await this.createAndRunWorkflow(workflowDefinition, this.envVariables, this.workflowName, this.source, this.expressServer);
    }

    readWorkflow = async (workflowName) => {

        let workflowPath = "";
        if(this.source){
            const rootDir = process.cwd();
            workflowPath = path.join(rootDir, (this.source + '/workflow.json'));
        }else {
            workflowPath = this.source || './projects/' + workflowName + '/workflow.json';
        }
        try {
            const data = await readFileAsync(workflowPath);
            const jsonData = JSON.parse(data.toString());
            return jsonData.stateMachine;
        } catch (error) {
            console.error('An error occurred:', error);
            throw error; // Re-throw the error to handle it outside the function if needed
        }
    }

    waitForContainerToExit(container) {
        return new Promise((resolve, reject) => {
            function checkStatus() {
                container.inspect((err, data) => {
                    if (err) {
                        return reject(err);
                    }
                    const isRunning = data.State.Running;
                    if (!isRunning) {
                        console.log(`Container ${container.id} has exited with status code ${data.State.ExitCode}`);
                        resolve(data.State.ExitCode); // Resolve the promise when the container exits
                    } else {
                        console.log(`Container ${container.id} is still running`);
                        // Check again after a short delay
                        setTimeout(checkStatus, 1000);
                    }
                });
            }
            checkStatus(); // Start the status check
        });
    }

    createContainer = async (context, event, { action }) => {
        action.Env = context;
        const container = await dockerActions.containerActions.startContainer(action, this.workflowName);
        this.trackContainer(action);
        if(action.awaitStart) {
            await this.verifyContainerServiceStarted(action);
        }
        console.log('Container Started');
        if(action.awaitFinish) {
            console.log(`${container.containerName} Complete`);
            const exitCode = await this.waitForContainerToExit(container);
            // I can evaluate the exit code and if not 0, can possibly throw an error to stop the execution
            this.activeWorkflow.send('NEXT');
        }else if(!action.await){
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
        const childWorkflow = new Workflow({workflowName: action.workflowName, parentWorkflow: this.activeWorkflow, envVariables: this.envVariables, source: action.source}, null);
        await childWorkflow.start();
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

    getFirstHostPort(bindings) {
        const ports = bindings.PortBindings;
        const firstPortKey = Object.keys(ports)[0]; // Get the first key
        if (firstPortKey) {
            const hostPort = ports[firstPortKey][0].HostPort;
            return hostPort;
        }
        return null; // Return null if no ports are found
    }


    verifyContainerServiceStarted = async (container) => {
        if(container.ExposedPorts && container.PortBindings) {
            const exposedPortKey = Object.keys(container.ExposedPorts)[0];
            const hostPort = this.getFirstHostPort(container);
            console.log(`hostPort ${hostPort}`);
            const exposedPort = exposedPortKey.split('/')[0];
            if (exposedPort === "27017") {
                console.log('Checking if MongoDB is ready');
                await containerValidation.checkMongoDBReady(container);
            } else {
                await containerValidation.checkHttpReady(container, hostPort);
            }
        }

    }

    actions = {
        createContainer: assign(async (context, event, meta) => {
            const { action } = meta;
            if(action.skip){
                console.log(`Skipping ${action.containerName}`);
                this.activeWorkflow.send('NEXT');
                return;
            }
            await this.createContainer(context, event, meta);
        }),
        createVolume:  assign(async (context, event, meta) => {
            await this.createVolume(context, event, meta);
        }),
        createNetwork:  assign(async (context, event, meta) => {
            await this.createNetwork(context, event, meta);
        }),
        runWorkflow:  assign(async (context, event, meta) => {
            const { action } = meta;
            if(action.skip){
                console.log(`Skipping ${action.workflowName}`);
                this.activeWorkflow.send('NEXT');
                return;
            }
            await this.runWorkflow(context, event, meta);
        }),
    };

    services = {};

    createAndRunWorkflow = (workflowDefinition, envVariables, workflowName, source, expressServer=null, parentWorkflow=null) => {
        workflowDefinition.context = {...envVariables, workflowName, parentWorkflow, source};
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
                    //await networkActions.cleanup(this.networks, this.containers);
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