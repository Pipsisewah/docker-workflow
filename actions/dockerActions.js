const Docker = require('dockerode');
const {MongoClient: mongoClient} = require("mongodb");
const docker = new Docker();

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

dockerActions.startContainer =  async (containerOptions) => {
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
};



module.exports = dockerActions;