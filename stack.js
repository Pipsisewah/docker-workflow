import Docker from 'dockerode';

// Create a Docker instance
const docker = new Docker();

const dockerRunner = {}

dockerRunner.start = async () => {
    // Function to create and start the MongoDB container
    async function createMongoDBContainer() {
        try {
            // Define options for creating the MongoDB container
            const mongoContainerOptions = {
                Image: 'mongo:latest', // MongoDB Docker image
                Env: ['MONGO_INITDB_ROOT_USERNAME=admin', 'MONGO_INITDB_ROOT_PASSWORD=password'], // MongoDB environment variables
                ExposedPorts: { '27017/tcp': {} }, // Expose MongoDB port
            };

            // Create the MongoDB container
            const mongoContainer = await docker.createContainer(mongoContainerOptions);

            // Start the MongoDB container
            await mongoContainer.start();

            console.log('MongoDB container started successfully.');

            return mongoContainer;
        } catch (error) {
            console.error('Error creating MongoDB container:', error);
            throw error;
        }
    }

// Function to create and start the Nginx container
    async function createNginxContainer(mongoContainer) {
        try {
            // Define options for creating the Nginx container
            const nginxContainerOptions = {
                Image: 'nginx:latest', // Nginx Docker image
                ExposedPorts: { '80/tcp': {} }, // Expose Nginx port
                HostConfig: {
                    PortBindings: { '80/tcp': [{ HostPort: '8080' }] }, // Map container's port 80 to host's port 8080
                    Links: ['mongo:db'], // Link the Nginx container to the MongoDB container
                },
            };

            // Create the Nginx container
            const nginxContainer = await docker.createContainer(nginxContainerOptions);

            // Start the Nginx container
            await nginxContainer.start();

            console.log('Nginx container started successfully.');

            return nginxContainer;
        } catch (error) {
            console.error('Error creating Nginx container:', error);
            throw error;
        }
    }

// Main function to create and start both containers
    async function main() {
        try {
            // Create and start the MongoDB container
            const mongoContainer = await createMongoDBContainer();

            // Create and start the Nginx container, passing the MongoDB container as a parameter
            await createNginxContainer(mongoContainer);
        } catch (error) {
            console.error('Error:', error);
        }
    }
}


export default dockerRunner;
