const {sendParent} = require("xstate");
const services =  {
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
            console.log('No Inspect Data');
            const mongoContainerOptions = {
                Image: 'mongo:latest',
                ExposedPorts: {'27017/tcp': {}}, // Expose MongoDB port
                HostConfig: {
                    PortBindings: {'27017/tcp': [{HostPort: '27017'}]} // Bind container port to host port
                },
                name: containerName
            };
            return actions.startContainer(mongoContainerOptions);
        } else if(containerExists && containerRunning){
            console.log('MongoDB Already Running"')
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
    //checkMongoDBReady: actions.checkMongoDBReady,
    //connectAndInsertDocument: actions.connectAndInsertDocument
}

module.exports = services;