const tar = require("tar-fs");
const path = require("path");
const axios = require("axios");
const Docker = require("dockerode");
const docker = new Docker();
const containerActions = {};
const containers = [];

containerActions.getContainers = () => {
    return containers;
}
containerActions.cleanup = async () => {

        // List all containers, including stopped ones
        const allContainers = await docker.listContainers({ all: true });

        // Iterate over the containers array
        for (const containerObj of containers) {
            const containerName = containerObj.containerName;

            // Find the container by name
            const containerInfo = allContainers.find(container =>
                container.Names.some(name => name === `/${containerName}`)
            );

            if (!containerInfo) {
                console.log(`Container with name ${containerName} not found.`);
                continue;
            }

            const container = docker.getContainer(containerInfo.Id);
            try {
                // Stop the container
                await container.stop();
                console.log(`Container ${containerName} stopped successfully.`);
            } catch (err) {
                console.error(`Error Stopping Container ${containerName}:`, err.message);
            }
            try {
                if (!containerObj.reuse) {
                    container.remove((err, data) => {
                        if (err) {
                            console.error(`Error removing the container ${containerName}:`, err);
                            return;
                        }
                        console.log(`Container ${containerName} removed:`, data);
                    });
                }
            }catch (err) {
                console.error(`Error Removing Container ${containerName}:`, err.message);
            }

        }
}

containerActions.trackContainer = (container) => {
    containers.push(container);
}

const buildImage = async (docker, contextPath, imageName) => {
    console.log(`Building Image ${imageName}`);
    const tarStream = tar.pack(contextPath);
    const stream = await docker.buildImage(tarStream,
        {
            t: imageName, // Tag your image
            pull: true,
        }
    );
    stream.pipe(process.stdout, { end: true });

    stream.on('data', (data) => {
        const log = data.toString('utf8');
        process.stdout.write(log);
    });
    await new Promise((resolve, reject) => {
        docker.modem.followProgress(stream, onFinished, onProgress);

        function onFinished(err, output) {
            console.log(`${imageName} build has finished`);
            resolve();
            //output is an array with output json parsed objects
            //...
        }
        function onProgress(event) {
            console.log(`${imageName} progress: ${JSON.stringify(event)}`);
        }

    });
    console.log(`${imageName} Image Built`);
};

function transformEnvObjectToArray(envObject) {
    return Object.entries(envObject).map(([key, value]) => `${key}=${value}`);
}

const createAndStartContainer = async (docker, containerConfig) => {
    const builtImageName = containerConfig.containerName + '-container'
    console.log(`Building and starting a new container ${builtImageName}`);
    const contextPath = path.join(__dirname, '../../images/', containerConfig.dockerFolderName);
    await buildImage(docker, contextPath, builtImageName);
    console.log(`Image built successfully ${builtImageName}`);
    console.log('Creating and starting container...');
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
    const container = await docker.createContainer({
        t: containerConfig.containerName,
        Image: builtImageName,
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
    });
    await container.start();
    return container;
};

containerActions.createContainer =  async (containerConfig) => {
    try {
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



        if (!containerExists) {
            await createAndStartContainer(docker, containerConfig);
            console.log('Container started successfully');
        } else if (!containerRunning) {
            console.log('Dockerfile Exists but is not running.  Starting!');
            const containerLookup = await docker.getContainer(containerConfig.containerName);
            await containerLookup.start();
        } else {
            console.log('Dockerfile already running!');
        }
        containerActions.trackContainer(containerConfig);

        function notifyMainService(containerId, status) {
            axios.post('http://localhost:3000/notify', {containerId, status})
                .then(response => {
                    console.log('Notification sent successfully');
                })
                .catch(error => {
                    console.error('Error sending notification:', error);
                });
        }

// Call notifyMainService when job is completed
        //notifyMainService(containerOptions.name, 'Job completed');
    } catch (err) {
        console.error(`Failed to start container!  ${err.message}`)
        throw new Error('Failed to start container!');
    }
    return docker.getContainer(containerConfig.containerName);
};


module.exports = containerActions;