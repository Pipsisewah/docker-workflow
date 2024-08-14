const Docker = require("dockerode");

let docker;

const dockerConfig = {};

dockerConfig.init = (config) => {
  docker = new Docker(config);
};

dockerConfig.getInstance = () => {
    if(!docker) {
        throw new Error('Dockerode has not been initialized!');
    }
    return docker;
}

module.exports = dockerConfig;
