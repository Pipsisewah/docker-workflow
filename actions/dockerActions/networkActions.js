const Docker = require("dockerode");
const docker = new Docker();
const networks = [];
const networkActions = {};

const getAllContainersUsingNetwork = async (networkName, containers) => {
    const containersUsingNetwork = [];
    for (const container of containers) {
        if(container.networkName === networkName){
            containersUsingNetwork.push(container);
        }
    }
    return containersUsingNetwork;
}

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
        let subnetConfig;
        if(networkInfo.subnetMask) {
            subnetConfig = {
                Config: [{
                    Subnet: networkInfo.subnetMask
                }]
            };
        }
        const network = await docker.createNetwork({
            Name: networkInfo.networkName,
            Driver: 'bridge',
            IPAM: subnetConfig
        });
        console.log('Network created:', network.id);
       networkActions.trackNetwork(networkInfo, network);
    } catch (err) {
        console.error('Error creating network:', err);
    }
}

networkActions.cleanup = async (containers) => {
    if(networks.length > 0){
        console.log('Cleaning up networks');
        for (const network of networks){
            if(!network.persist){
                try {
                    const containersUsingNetwork = await getAllContainersUsingNetwork(network.name, containers);
                    if(containersUsingNetwork.length > 0){
                        console.log(`Unable to delete network ${network.name}.  A reusable container requires this network to sustain`);
                        continue;
                    }
                    const networkToDelete = docker.getNetwork(network.networkInfo.id);
                    networkToDelete.remove();
                    console.log(`Network ${network.name} deleted`);
                }catch (err) {
                    console.error(`Unable to delete Network! ${network.name}  ${err}`);
                }
            }
        }
    }
}


module.exports = networkActions;