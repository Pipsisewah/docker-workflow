import Docker from 'dockerode';

// Create a Docker instance
const docker = new Docker();

const dockerControl = {};

// Define options for pulling the image
const imageOptions = {
    fromImage: 'nginx',
    tag: 'latest',
};

dockerControl.startContainer = () => {
    // Pull the Docker image
    docker.pull('nginx:latest', function(err, stream) {
        if (err) {
            console.error('Error pulling image:', err);
            return;
        }

        docker.modem.followProgress(stream, onFinished, onProgress);

        function onFinished(err, output) {
            if (err) {
                console.error('Error pulling image:', err);
                return;
            }
            console.log('Image pulled successfully.');
            createContainer();
        }

        function onProgress(event) {
            console.log('Pulling image:', event.status);
        }
    });

// Function to create and start the container
    function createContainer() {
        // Define options for creating a container
        const containerOptions = {
            Image: 'nginx:latest', // Docker image to use
            Tty: true, // Allocate a pseudo-TTY
            HostConfig: {
                PortBindings: {
                    '80/tcp': [{ HostPort: '8080' }] // Map container's port 80 to host's port 8080
                }
            }
        };

        // Create a container
        docker.createContainer(containerOptions, function(err, container) {
            if (err) {
                console.error('Error creating container:', err);
                return;
            }

            // Start the container
            container.start(function(err) {
                if (err) {
                    console.error('Error starting container:', err);
                    return;
                }

                console.log('Container started successfully.');

                // Get container logs
                container.logs({ follow: true, stdout: true, stderr: true }, function(err, stream) {
                    if (err) {
                        console.error('Error getting container logs:', err);
                        return;
                    }

                    // Pipe container logs to stdout
                    stream.pipe(process.stdout);
                });

                // Monitor container's status
                container.wait(function(err, data) {
                    if (err) {
                        console.error('Error monitoring container status:', err);
                        return;
                    }

                    console.log('Container exited with code:', data.StatusCode);
                });
            });
        });
    }
}

export default dockerControl;

