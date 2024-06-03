const Docker = require('dockerode');
const {MongoClient: mongoClient} = require("mongodb");
const axios = require("axios");
const docker = new Docker();
const fs = require('fs');
const util = require('util');

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
        return new Promise((resolve, reject) => {
            const fileInfo = fs.readFileSync('./images/'+ containerOptions.dockerFileName);
            docker.buildImage(fileInfo, containerOptions, (error, stream) => {
                if (error) {
                    console.error('Error building image:', error);
                    return;
                }

                // Log build progress
                docker.modem.followProgress(stream, onFinished, onProgress);
            });

            function onFinished(error, output) {
                if (error) {
                    console.error('Error building image:', error);
                    return;
                }
                console.log('Image built successfully:', output);

                docker.createContainer(containerOptions, (err, container) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    container.start((err) => {
                        if (err) {
                            reject(err);
                            return;
                        }
                        resolve(container);
                    });
                });
            };
        });
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