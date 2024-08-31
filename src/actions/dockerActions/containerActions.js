const tar = require("tar-fs");
const dockerConfig = require('../../dockerConfig');
const path = require("path");
const util = require('util');

const containerActions = {};

containerActions.getContainer = async(containerName) => {
    const allContainers = await dockerConfig.getInstance().listContainers({ all: true });
    const containerInfo = allContainers.find(container =>
        container.Names.some(name => name === `/${containerName}`)
    );
    const container = dockerConfig.getInstance().getContainer(containerInfo.Id);
    if(!container){
        throw new Error(`Container with name ${containerInfo.containerName} not found.`);
    }
    return container;
}

containerActions.stopContainer = async(container, containerInfo) => {
    try {
        await container.stop();
        console.log(`Container ${containerInfo.containerName} stopped successfully.`);
    } catch (err) {
        console.error(`Error Stopping Container ${containerInfo.containerName}:`, err.message);
    }
}

containerActions.removeContainer = async(container, containerInfo) => {
    try {
        if (!containerInfo.reuse) {
            const removeContainer = util.promisify(container.remove).bind(container);
            await removeContainer();
            console.log(`Container ${containerInfo.containerName} deleted`);
        }
    }catch (err) {
        console.error(`Error Removing Container ${containerInfo.containerName}:`, err.message);
    }
    console.log('Returning from removeContainer');
}




const attachDebugLogsToContainer = async(containerBuildStream) => {
    containerBuildStream.pipe(process.stdout, { end: true });
    containerBuildStream.on('data', (data) => {
            const log = data.toString('utf8');
            process.stdout.write(log);
        });
}
const buildImage = async (containerConfig, workflowName) => {
    console.log(`Building Image ${containerConfig.containerName}`);
    let contextPath = "";
    console.log(`containerConfig.Env.source ${containerConfig.Env.source}`);
    if(containerConfig.Env.source){
        const rootDir = process.cwd();
        contextPath = path.join(rootDir, containerConfig.Env.source, 'containers', containerConfig.dockerFolderName);
    }else {
        contextPath = path.join(__dirname, '../../../projects/', workflowName, '/containers/', containerConfig.dockerFolderName);
    }
    const tarStream = tar.pack(contextPath);
    const stream = await dockerConfig.getInstance().buildImage(tarStream,
        {
            t: containerConfig.containerName, // Tag your image
            pull: true,
        }
    );
     // // if(process.env.debug) {
     //    await attachDebugLogsToContainer(stream);
     // // }
    await new Promise((resolve, reject) => {
        function onFinished(err, output) {
            console.log(`${containerConfig.containerName} build has finished`);
            resolve();
        }
        function onProgress(event) {
            //if(process.env.debug) {
            if (event.progressDetail && event.progressDetail.total) {
                const percentage = (event.progressDetail.current / event.progressDetail.total) * 100;
                //console.log(`Layer ${event.id}: ${percentage.toFixed(2)}% complete`);
            } else if (event.status) {
                console.log(`${containerConfig.containerName} Layer Status: ${event.status}`);
            }
                //console.log(`${containerConfig.containerName} building: ${JSON.stringify(event.stream)}`);
            //}
        }
        dockerConfig.getInstance().modem.followProgress(stream, onFinished, onProgress);
    });
    console.log(`${containerConfig.containerName} Image Built`);
};

function transformEnvObjectToArray(envObject) {
    return Object.entries(envObject).map(([key, value]) => `${key}=${value}`);
}

const configureContainer = (containerConfig) => {
    let NetworkingConfig = {};
    if(containerConfig.Dns){
        containerConfig.Dns = [containerConfig.Dns];
    }
    if(containerConfig.ipaddress){
        NetworkingConfig = {
            EndpointsConfig: {
                [containerConfig.networkName]: {
                    IPAMConfig: {
                        IPv4Address: containerConfig.ipaddress
                    }
                }
            }
        }
    }
    const env = transformEnvObjectToArray(containerConfig.Env);
    console.log(`ENV VARIABLES: ${env}`);
    console.log(`container source: ${containerConfig.source}`);
    return {
        t: containerConfig.containerName,
        Image: containerConfig.containerName,
        name: containerConfig.containerName,
        Hostname: containerConfig.hostname || (containerConfig.containerName + '.com'),
        Tty: true,
        Env: env,
        source: containerConfig.source,
        HostConfig: {
            NetworkMode: containerConfig.networkName,
            PortBindings: containerConfig.PortBindings,
            ExposedPorts: containerConfig.ExposedPorts,
            Binds: containerConfig.Binds,
            CapAdd: containerConfig.CapAdd,
            Dns: containerConfig.Dns,
        },
        NetworkingConfig
    }
};

const createAndStartContainer = async (containerConfig, workflowName) => {
    await buildImage(containerConfig, workflowName);
    const container = await dockerConfig.getInstance().createContainer(configureContainer(containerConfig));
    await container.start();
};

const removeIfNotReuse = async (containerConfig) => {
        let containerExists = false;
        let containerRunning = false;
        try {
            const containerLookup = await dockerConfig.getInstance().getContainer(containerConfig.containerName);
            const containerInspection = await dockerConfig.getInstance().getContainer(containerConfig.containerName).inspect();
            containerExists = true;
            containerRunning = (containerInspection.State.Running === true);
            if(containerExists && !containerConfig.reuse){
                if(containerRunning){
                    console.log(`Stopping Container: ${containerConfig.containerName}`);
                    await containerLookup.stop();
                    console.log(`Container Stopped: ${containerConfig.containerName}`);
                }
                console.log(`Killing Container: ${containerConfig.containerName}`);
                await containerLookup.remove();
                console.log(`Container Destroyed: ${containerConfig.containerName}`);
                containerExists = false;
                containerRunning = false;
            }
        } catch (err) {
            // Do nothing, already set to false
            console.log(err.message);
        }
        return {containerExists, containerRunning};
}

containerActions.startContainer =  async (containerConfig, workflowName) => {
    try {
        const {containerExists, containerRunning} = await removeIfNotReuse(containerConfig);
        console.log(`${containerConfig.containerName} containerExists: ${containerExists} containerRunning ${containerRunning}`);
        if (!containerExists) {
            await createAndStartContainer(containerConfig, workflowName);
            console.log('Container started successfully');
        } else if (!containerRunning) {
            console.log('Dockerfile Exists but is not running.  Starting!');
            const containerLookup = await dockerConfig.getInstance().getContainer(containerConfig.containerName);
            await containerLookup.start();
        } else {
            console.log('Dockerfile already running!');
        }
    } catch (err) {
        console.error(`Failed to start container!  ${err.message}`)
        throw new Error('Failed to start container!');
    }
    return dockerConfig.getInstance().getContainer(containerConfig.containerName);
};


module.exports = containerActions;