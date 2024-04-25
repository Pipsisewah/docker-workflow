const Docker = require('dockerode');
const { Machine, assign, sendParent, send } = require('xstate');
const mongoClient = require('mongodb').MongoClient;
// Create a Docker instance
const docker = new Docker();

// Define machine actions
const actions = {
    pullImage: async (imageName) => {
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
    },
    startContainer: async (containerOptions) => {
        return new Promise((resolve, reject) => {
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
        });
    },
    checkMongoDBReady: async () => {
        let attempts = 0;
        const maxAttempts = 10;
        const delay = 3000; // Delay in milliseconds between attempts

        const check = async () => {
            const mongoClient = require('mongodb').MongoClient;
            try {
                const client = await mongoClient.connect(
                    'mongodb://localhost:27017',
                    { useNewUrlParser: true, useUnifiedTopology: true }
                );
                await client.close();
                return;
            } catch (err) {
                attempts++;
                if (attempts >= maxAttempts) {
                    throw new Error('MongoDB failed to start after max attempts');
                }
                console.log('MongoDB not ready, retrying...');
                await new Promise(resolve => setTimeout(resolve, delay));
                await check();
            }
        };

        await check();
    },
    connectAndInsertDocument: async () => {
        console.log('Now in connectAndInsertDocument');
        console.log('Connecting to MongoDB');
        const client = await mongoClient.connect(
            'mongodb://localhost:27017',
            { useNewUrlParser: true, useUnifiedTopology: true }
        );
        console.log('Connecting to db to write');
        const db = client.db('test');
        const collection = db.collection('documents');
        await collection.insertOne({ message: 'Hello from Nginx! Again' });
        console.log('Should have written to database');
        await client.close();
        console.log('Connectin to DB should now be closed');
    }
};

function onProgress(event) {
    console.log('Build progress:', event);
}

// Define the Dockerode script execution machine
const dockerScriptMachine = Machine(
    {
        id: 'dockerScript',
        initial: 'pullingImages',
        context: {
            mongoDBContainer: null,
            nginxContainer: null
        },
        states: {
            pullingImages: {
                invoke: {
                    src: 'pullImages',
                    onDone: 'startingMongoDB'
                }
            },
            startingMongoDB: {
                invoke: {
                    src: 'startMongoDB',
                    onDone: 'checkingMongoDB'
                }
            },
            checkingMongoDB: {
                invoke: {
                    src: 'checkMongoDBReady',
                    onDone: 'startingNginx'
                }
            },
            startingNginx: {
                invoke: {
                    src: 'startNginx',
                    onDone: 'connectingAndInsertingDocument'
                }
            },
            connectingAndInsertingDocument: {
                invoke: {
                    src: 'connectAndInsertDocument',
                    onDone: {
                        target: 'running',
                    }
                }
            },
            running: {
                type: 'final'
            }
        }
    },
    {
        actions,
        services: {
            pullImages: async () => {
                await actions.pullImage('mongo:latest');
                await actions.pullImage('nginx:latest');
                console.log('Images have been pulled');
            },
            startMongoDB: async () => {
                const containerName = 'my_mongodb_container';
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
                    // console.log('No Inspect Data');
                    // const mongoContainerOptions = {
                    //     Image: 'mongo:latest',
                    //     ExposedPorts: {'27017/tcp': {}}, // Expose MongoDB port
                    //     HostConfig: {
                    //         PortBindings: {'27017/tcp': [{HostPort: '27017'}]} // Bind container port to host port
                    //     },
                    //     name: containerName
                    // };
                    // return actions.startContainer(mongoContainerOptions);
                    const buildOptions = {
                        t: containerName + '-template', // Tag for the image
                        AttachStdin: false,
                        AttachStdout: true,
                        AttachStderr: true,
                        Tty: true,
                        OpenStdin: false,
                        StdinOnce: false,
                        ExposedPorts: {'27017/tcp': {}}, // Expose MongoDB port
                        HostConfig: {
                             PortBindings: {'27017/tcp': [{HostPort: '27017'}]} // Bind container port to host port
                        },
                        buildargs: {
                            // Optionally specify build arguments
                            ARG_NAME: 'value',
                        },
                    };
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
                            ExposedPorts: {'27017/tcp': {}}, // Expose MongoDB port
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
                    console.log('MongoDB Already Running"')
                    sendParent('CONTAINERS_READY');
                    return;
                } else {
                    console.log('MongoDB Exists but is not running.  Starting!');
                    const container = await docker.getContainer(containerName);
                    await container.start();
                }
            },
            startNginx: async () => {
                const nginxContainerOptions = {
                    Image: 'nginx:latest',
                    ExposedPorts: { '80/tcp': {} },
                    HostConfig: {
                        PortBindings: { '80/tcp': [{ HostPort: '8080' }] },
                        Links: ['my_mongodb_container:db']
                    }
                };
                return actions.startContainer(nginxContainerOptions);
            },
            checkMongoDBReady: actions.checkMongoDBReady,
            connectAndInsertDocument: actions.connectAndInsertDocument
        }
    }
);

// Usage:

const { interpret } = require('xstate');

// Create an interpreter for the machine
const interpreter = interpret(dockerScriptMachine)
    .onTransition(state => console.log('Current state:', state.value))
    .start();

interpreter.onTransition(state => {
    console.log('Transitioned to:', state.value);

    // Check if the machine has reached the final state
    if (state.done) {
        console.log('Machine is in a "done" state.');
    }
})

// Start the interpreter
interpreter.send('START');
