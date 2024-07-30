const Docker = require("dockerode");
const docker = new Docker();
const volumeActions = {};




volumeActions.createVolume = async (action) => {
    const volume = await docker.createVolume({
        Name: action.Name
    });
    return {
        name: action.Name,
        persist: action.persist,
        volume: volume
    }
}

volumeActions.cleanup = async (volumes) => {
    if(volumes.length > 0){
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