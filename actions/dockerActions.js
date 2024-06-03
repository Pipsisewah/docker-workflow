const Docker = require('dockerode');
const {MongoClient: mongoClient} = require("mongodb");
const axios = require("axios");
const docker = new Docker();
const fs = require('fs');
const util = require('util');
const path = require('path');

const dockerActions = {};

dockerActions.pullImage =  async (imageName) => {
    return new Promise((resolve, reject) => {
        docker.pull(imageName, (err, stream) => {
            if (err) {
                reject(err);
                return;
            }
            docker.modem.followProgress(stream, (err, output) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(output);
            });
        });
    });
};

function onProgress(event) {
    console.log('Build progress:', event);
}

const buildImage = async (docker, contextPath, imageName) => {
    const stream = await docker.buildImage(
        {
            context: contextPath,
            src: ['Dockerfile'], // Include other necessary files
        },
        {
            t: imageName, // Tag your image
            pull: true,
        }
    );

    await new Promise((resolve, reject) => {
        docker.modem.followProgress(stream, (err, res) => (err ? reject(err) : resolve(res)));
    });
};

const createAndStartContainer = async (docker, containerOptions) => {
    const container = await docker.createContainer({
        Image: containerOptions.builtImageName,
        name: containerOptions.name,
        Tty: true,
        ExposedPorts: containerOptions.ExposedPorts,
        HostConfig: containerOptions.HostConfig
    });

    await container.start();
    return container;
};

dockerActions.startContainer =  async (containerOptions) => {
    let containerExists = false;
    let containerRunning = false;
    try{
        const container = await docker.getContainer(containerOptions.name).inspect();
        containerExists = true;
        containerRunning = (container.State.Running === true);
    } catch (err) {
        // Do nothing, already set to false
        console.log(err.message);
    }

    if(!containerExists){
        console.log('Building image...');
        const contextPath = path.join(__dirname, '../images/', containerOptions.dockerFolderName);
        containerOptions.builtImageName = containerOptions.name + '-template';
        await buildImage(docker, contextPath, containerOptions.builtImageName);
        console.log(`Image built successfully ${containerOptions.builtImageName}`);
        console.log('Creating and starting container...');
        const container = await createAndStartContainer(docker, containerOptions);
        console.log('Container started successfully');
    } else if(!containerRunning){
        console.log('Dockerfile Exists but is not running.  Starting!');
        const container = await docker.getContainer(containerOptions.name);
        await container.start();
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