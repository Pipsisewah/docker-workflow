const Docker = require('dockerode');
const {MongoClient: mongoClient} = require("mongodb");
const axios = require("axios");
const docker = new Docker();
const path = require('path');
const tar = require('tar-fs');

const dockerActions = {};

dockerActions.doesNetworkExist = async (networkName) => {
    try {
        const networks = await docker.listNetworks();
        return networks.find(net => net.Name === networkName);
    } catch (err) {
        console.error('Error listing networks:', err);
    }
}

dockerActions.createNetwork = async (networkInfo) => {
    try {
        console.log(`Creating network: ${networkInfo.networkName}`);
        const network = await docker.createNetwork({
            Name: networkInfo.networkName,
            Driver: 'bridge',
            IPAM: {
                Config: [{
                    Subnet: networkInfo.subnetMask
                }]
            }
        });
        console.log('Network created:', network.id);
    } catch (err) {
        console.error('Error creating network:', err);

    }
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
            CapAdd: containerConfig.CapAdd,
            Dns: containerConfig.Dns
        },
        NetworkingConfig
    });
    await container.start();
    return container;
};

dockerActions.createContainer =  async (containerConfig) => {
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

dockerActions.createVolume = async (name) => {
    return await docker.createVolume({
        Name: name
    })
}


module.exports = dockerActions;