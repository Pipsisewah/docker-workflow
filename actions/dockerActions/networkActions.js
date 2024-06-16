const Docker = require("dockerode");
const docker = new Docker();
const networks = [];
const networkActions = {};


networkActions.getActiveNetworkInfo = async (networkName) => {
    try {
        const networks = await docker.listNetworks();
        const network = networks.find(net => net.Name === networkName);
        return docker.getNetwork(network.Id);
    } catch (err) {
        console.error('Error listing networks:', err);
    }
    return null;
}

networkActions.trackNetwork = (networkInfo, dockerNetwork) => {
    networks.push({
        name: networkInfo.networkName,
        persist: networkInfo.persist,
        networkInfo: dockerNetwork
    });
}


networkActions.createNetwork = async (networkInfo) => {
    try {
        console.log(`Creating network: ${networkInfo.networkName}`);
        const network = await docker.createNetwork({
            Name: networkInfo.networkName,
            Driver: 'bridge',
            IPAM: {
                Config: [{
                    Subnet: networkInfo.subnetMask
                }]
            }
        });
        console.log('Network created:', network.id);
       networkActions.trackNetwork(networkInfo, network);
    } catch (err) {
        console.error('Error creating network:', err);
    }
}

networkActions.cleanup = async () => {
    if(networks.length > 0){
        console.log('Cleaning up networks');
        for (const network of networks){
            if(!network.persist){
                try {
                    const networkToDelete = docker.getNetwork(network.networkInfo.id);
                    networkToDelete.remove();
                    console.log(`Network ${network.name} deleted`);
                }catch (err) {
                    console.error(`Unable to delete Network! ${network.Name}  ${err}`);
                }
            }
        }
    }
}


module.exports = networkActions;