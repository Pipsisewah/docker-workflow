const Docker = require("dockerode");
const docker = new Docker();
const volumeActions = {};
const volumes = [];

volumeActions.createVolume = async (action) => {
    const createdVolume = await docker.createVolume({
        Name: action.Name
    });
    volumes.push({
        name: action.Name,
        persist: action.persist,
        volume: createdVolume
    });
}

volumeActions.cleanup = () => {
    if(volumes.length > 0){
        console.log('Cleaning up open volumes');
        for (const attachedVolume of volumes){
            if(!attachedVolume.persist){
                try {
                    attachedVolume.volume.remove();
                    console.log(`Volume ${attachedVolume.name} delete`);
                }catch (err) {
                    console.error(`Unable to delete volume! ${attachedVolume.name}  ${err}`);
                }
            }
        }
    }
}

module.exports = volumeActions;