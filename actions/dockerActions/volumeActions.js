const Docker = require("dockerode");
const docker = new Docker();
const volumeActions = {};

volumeActions.createVolume = async (name) => {
    return await docker.createVolume({
        Name: name
    })
}

module.exports = volumeActions;