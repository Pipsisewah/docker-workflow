const tar = require("tar-fs");
const path = require("path");
const Docker = require("dockerode");
const docker = new Docker();
const containerActions = {};
const containers = [];

containerActions.getContainers = () => {
    return containers;
}

const getContainer = async(containerName) => {
    const allContainers = await docker.listContainers({ all: true });
    const containerInfo = allContainers.find(container =>
        container.Names.some(name => name === `/${containerName}`)
    );
    const container = docker.getContainer(containerInfo.Id);
    if(!container){
        throw new Error(`Container with name ${containerInfo.containerName} not found.`);
    }
    return container;
}

const stopContainer = async(container, containerInfo) => {
    try {
        await container.stop();
        console.log(`Container ${containerInfo.containerName} stopped successfully.`);
    } catch (err) {
        console.error(`Error Stopping Container ${containerInfo.containerName}:`, err.message);
    }
}

const removeContainer = async(container, containerInfo) => {
    try {
        if (!containerInfo.reuse) {
            container.remove((err, data) => {
                if (err) {
                    console.error(`Error removing the container ${containerInfo.containerName}:`, err);
                    return;
                }
                console.log(`Container ${containerInfo.containerName} deleted`);
            });
        }
    }catch (err) {
        console.error(`Error Removing Container ${containerInfo.containerName}:`, err.message);
    }
}


containerActions.cleanup = async () => {
        for (const containerObj of containers) {
            try {
                const container = await getContainer(containerObj.containerName);
                if(!containerObj.sustain) {
                    await stopContainer(container, containerObj);
                    await removeContainer(container, containerObj);
                }
            } catch (err) {
                console.error(err);
            }
        }
}

containerActions.trackContainer = (container) => {
    containers.push(container);
}

const attachDebugLogsToContainer = async(containerBuildStream) => {
    containerBuildStream.pipe(process.stdout, { end: true });
    containerBuildStream.on('data', (data) => {
            const log = data.toString('utf8');
            process.stdout.write(log);
        });
}
const buildImage = async (docker, containerConfig, workflowName) => {
    console.log(`Building Image ${containerConfig.containerName}`);
    const contextPath = path.join(__dirname, '../../projects/', workflowName, '/containers/', containerConfig.dockerFolderName);
    const tarStream = tar.pack(contextPath);
    const stream = await docker.buildImage(tarStream,
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
            if(process.env.debug) {
                console.log(`${containerConfig.containerName} progress: ${JSON.stringify(event)}`);
            }
        }
        docker.modem.followProgress(stream, onFinished, onProgress);
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
    return {
        t: containerConfig.containerName,
        Image: containerConfig.containerName,
        name: containerConfig.containerName,
        Tty: true,
        Env: env,
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
}
const createAndStartContainer = async (docker, containerConfig, workflowName) => {
    await buildImage(docker, containerConfig, workflowName);
    const container = await docker.createContainer(configureContainer(containerConfig));
    await container.start();
};

const removeIfNotReuse = async (containerConfig) => {
        let containerExists = false;
        let containerRunning = false;
        try {
            const containerLookup = await docker.getContainer(containerConfig.containerName);
            const containerInspection = await docker.getContainer(containerConfig.containerName).inspect();
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
        if (!containerExists) {
            await createAndStartContainer(docker, containerConfig, workflowName);
            console.log('Container started successfully');
        } else if (!containerRunning) {
            console.log('Dockerfile Exists but is not running.  Starting!');
            const containerLookup = await docker.getContainer(containerConfig.containerName);
            await containerLookup.start();
        } else {
            console.log('Dockerfile already running!');
        }
        containerActions.trackContainer(containerConfig);
    } catch (err) {
        console.error(`Failed to start container!  ${err.message}`)
        throw new Error('Failed to start container!');
    }
    return docker.getContainer(containerConfig.containerName);
};


module.exports = containerActions;