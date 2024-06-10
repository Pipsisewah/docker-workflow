const Docker = require('dockerode');
const {MongoClient: mongoClient} = require("mongodb");
const axios = require("axios");
const docker = new Docker();
const path = require('path');
const tar = require('tar-fs');

const dockerActions = {};

async function getNetworkIdByName(networkName) {
    try {
        const networks = await docker.listNetworks();
        return networks.find(net => net.Name === networkName);
    } catch (err) {
        console.error('Error listing networks:', err);
    }
}

async function getNetworkId(networkName){
    let networkId = await getNetworkIdByName(networkName);
    if(!networkId) {
        try {
            const network = await docker.createNetwork({
                Name: networkName,
                Driver: 'bridge'
            });
            console.log('Network created:', network.id);
            networkId = network.id;
        } catch (err) {
            console.error('Error creating network:', err);

        }
    }
    return networkId;
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
    await new Promise((resolve, reject) => {
        docker.modem.followProgress(stream, (err, res) => (err ? reject(err) : resolve(res)));
    });
    console.log(`${imageName} Image Built`);
};

const createAndStartContainer = async (docker, containerConfig) => {
    const builtImageName = containerConfig.containerName + '-container'
    const contextPath = path.join(__dirname, '../images/', containerConfig.dockerFolderName);
    await buildImage(docker, contextPath, builtImageName);
    console.log(`Image built successfully ${builtImageName}`);
    console.log('Creating and starting container...');
    const containerNetworkId = await getNetworkId(containerConfig.networkName);
    const container = await docker.createContainer({
        t: containerConfig.containerName,
        Image: builtImageName,
        name: containerConfig.containerName,
        Tty: true,
        HostConfig: {
            NetworkMode: containerConfig.networkName,
            PortBindings: containerConfig.PortBindings,
            ExposedPorts: containerConfig.ExposedPorts,
            Binds: containerConfig.Binds,
        },
    });
    await container.start();
    return container;
};

dockerActions.startContainer =  async (containerConfig, reuse) => {
    try {
        let containerExists = false;
        let containerRunning = false;
        try {
            const containerLookup = await docker.getContainer(containerConfig.containerName);
            const containerInspection = await docker.getContainer(containerConfig.containerName).inspect();
            containerExists = true;
            containerRunning = (containerInspection.State.Running === true);
            if(containerExists && !reuse){
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
            const container = await createAndStartContainer(docker, containerConfig);
            console.log('Container started successfully');
        } else if (!containerRunning) {
            console.log('Dockerfile Exists but is not running.  Starting!');
            const containerLookup = await docker.getContainer(containerConfig.containerName);
            await containerLookup.start();
        } else {
            console.log('Dockerfile already running!');
        }

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
};

dockerActions.createVolume = async (name) => {
    return await docker.createVolume({
        Name: name
    })
}


module.exports = dockerActions;