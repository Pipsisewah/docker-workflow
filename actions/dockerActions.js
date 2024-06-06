const Docker = require('dockerode');
const {MongoClient: mongoClient} = require("mongodb");
const axios = require("axios");
const docker = new Docker();
const fs = require('fs');
const util = require('util');
const path = require('path');
const tar = require('tar-fs');

const dockerActions = {};

async function getNetworkIdByName(networkName) {
    try {
        const networks = await docker.listNetworks();
        const network = networks.find(net => net.Name === networkName);

        if (network) {
            console.log(`Network '${networkName}' exists with ID: ${network.Id}`);
            return network.Id;
        } else {
            console.log(`Network '${networkName}' does not exist.`);
            return null;
        }
    } catch (err) {
        console.error('Error listing networks:', err);
    }
}

async function getNetworkId(networkName){
    const netId = await getNetworkIdByName(networkName);
    networkId = netId || null;
    console.log(`Network Id: ${networkId}`);
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
    console.log(`Running BuildImage on ${imageName}`);
    const tarStream = tar.pack(contextPath);
    const stream = await docker.buildImage(tarStream,
        {
            t: imageName, // Tag your image
            pull: true,
        }
    );
    console.log(`${imageName} Image Should Be Built`);

    await new Promise((resolve, reject) => {
        docker.modem.followProgress(stream, (err, res) => (err ? reject(err) : resolve(res)));
    });
};

const createAndStartContainer = async (docker, containerConfig) => {
    console.log('Building image...');
    console.log(`What is container ${containerConfig}`);
    const builtImageName = containerConfig.containerName + '-container'
    const contextPath = path.join(__dirname, '../images/', containerConfig.dockerFolderName);
    await buildImage(docker, contextPath, builtImageName);
    console.log(`Image built successfully ${builtImageName}`);
    console.log('Creating and starting container...');
    const containerNetworkId = await getNetworkId(containerConfig.networkName);
    console.log(`Applying the following network ID: ${containerNetworkId}`);
    const container = await docker.createContainer({
        t: containerConfig.containerName,
        Image: builtImageName,
        name: containerConfig.containerName,
        Tty: true,
        HostConfig: {
            NetworkMode: containerConfig.networkName,
            PortBindings: containerConfig.PortBindings,
            ExposedPorts: containerConfig.ExposedPorts,
        },
    });

    await container.start();
    return container;
};

dockerActions.startContainer =  async (containerConfig) => {
    let containerExists = false;
    let containerRunning = false;
    try{
        const containerLookup = await docker.getContainer(containerConfig.containerName).inspect();
        containerExists = true;
        containerRunning = (containerLookup.State.Running === true);
    } catch (err) {
        // Do nothing, already set to false
        console.log(err.message);
    }

    if(!containerExists){
        const container = await createAndStartContainer(docker, containerConfig);
        console.log('Container started successfully');
    } else if(!containerRunning){
        console.log('Dockerfile Exists but is not running.  Starting!');
        const containerLookup = await docker.getContainer(containerConfig.containerName);
        await containerLookup.start();
    }else {
        console.log('Dockerfile already running!');
    }
    function notifyMainService(containerId, status) {
        axios.post('http://localhost:3000/notify', { containerId, status })
            .then(response => {
                console.log('Notification sent successfully');
            })
            .catch(error => {
                console.error('Error sending notification:', error);
            });
    }

// Call notifyMainService when job is completed
    //notifyMainService(containerOptions.name, 'Job completed');
};



module.exports = dockerActions;