const Docker = require('dockerode');
const fs = require("fs");
const docker = new Docker();

const services = {};

function onProgress(event) {
    console.log('Build progress:', event);
}

services.startMongoDB =  async () => {
    const dockerfileContent = fs.readFileSync("./config/mongodb.json", 'utf-8');
    const parsedData = JSON.parse(dockerfileContent);
    const containerName = parsedData.containerName//'my_mongodb_container';
    const dockerFileName = parsedData.dockerFileName;
    console.log(`ContainerName ${containerName}`);
    let containerExists = false;
    let containerRunning = false;
    try{
        const container = await docker.getContainer(containerName).inspect();
        containerExists = true;
        containerRunning = (container.State.Running === true);
    } catch (err) {
        // Do nothing, already set to false
        console.log(err.message);
    }
    if(!containerExists) {
        console.log('Container does not exist!  Building a new one');
        const buildOptions = {
            t: containerName + '-template', // Tag for the image
            dockerfile: dockerFileName,
            ExposedPorts: parsedData.exposedPorts, // Expose Dockerfile port
            HostConfig: parsedData.HostConfig,
            buildargs: parsedData.arguments,
        };
        console.log(`buildOptions ${JSON.stringify(buildOptions)}`);
        const tarStream = require('tar-fs').pack('./images/');
        console.log(JSON.stringify(tarStream));
        // Build the image
        // Build the image (assuming you already have this part)
        docker.buildImage(tarStream, buildOptions, (error, stream) => {
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

            // Create a container based on the built image

            docker.createContainer({
                Image: containerName + '-template', // Tag of the built image
                name: containerName, // Name for the container
                ExposedPorts: {'27017/tcp': {}}, // Expose Dockerfile port
                HostConfig: {
                    PortBindings: {'27017/tcp': [{HostPort: '27017'}]} // Bind container port to host port
                },
                // Add other container options if needed
            }, (error, container) => {
                if (error) {
                    console.error('Error creating container:', error);
                    return;
                }
                console.log('Container created:', container.id);

                // Start the container
                container.start((error) => {
                    if (error) {
                        console.error('Error starting container:', error);
                        return;
                    }
                    console.log('Container started successfully');
                });
            });
        }
        return;
    } else if(containerExists && containerRunning){
        return;
    } else {
        console.log('Dockerfile Exists but is not running.  Starting!');
        const container = await docker.getContainer(containerName);
        await container.start();
    }
}

module.exports = services;