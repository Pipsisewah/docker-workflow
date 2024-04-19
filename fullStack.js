const Docker = require('dockerode');
const { Machine, assign, sendParent } = require('xstate');
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
                client.close();
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
            'mongodb://mongo:27017',
            { useNewUrlParser: true, useUnifiedTopology: true }
        );
        console.log('Connecting to db to write');
        const db = client.db('test');
        const collection = db.collection('documents');
        await collection.insertOne({ message: 'Hello from Nginx!' });
        console.log('Should have written to database');
        await client.close();
    }
};

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
                        actions: sendParent({ type: 'CONTAINERS_READY' }),
                        target: 'running'
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
            },
            startMongoDB: async () => {
                const mongoContainerOptions = {
                    Image: 'mongo:latest',
                    ExposedPorts: { '27017/tcp': {} }, // Expose MongoDB port
                    HostConfig: {
                        PortBindings: { '27017/tcp': [{ HostPort: '27017' }] } // Bind container port to host port
                    },
                    name: 'my_mongodb_container'
                };
                return actions.startContainer(mongoContainerOptions);
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
            // Add async keyword to make it an asynchronous function
            async connectAndInsertDocument(context, event) {
                // Await the execution of connectAndInsertDocument
                console.log('Attempting to call connect and insert document');
                await actions.connectAndInsertDocument();
            },
        }
    }
);

// Usage:

const { interpret } = require('xstate');

// Create an interpreter for the machine
const interpreter = interpret(dockerScriptMachine)
    .onTransition(state => console.log('Current state:', state.value))
    .start();

// Listen for CONTAINERS_READY event
interpreter.onEvent((event) => {
    if (event.type === 'CONTAINERS_READY') {
        console.log('MongoDB and Nginx containers are ready.');
    }
});

// Start the interpreter
interpreter.send('START');
