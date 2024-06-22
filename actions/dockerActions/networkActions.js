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
        if(!network){
            console.log(`Network ${networkName} does not exist!`);
            return;
        }
        return docker.getNetwork(network.Id);
    } catch (err) {
        console.error('Error listing networks:', err);
    }
    return null;
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
        console.log('Network created:', networkInfo.networkName);
       return {...networkInfo, id: network.id};
    } catch (err) {
        console.error('Error creating network:', err);
    }
}

networkActions.cleanup = async (networks, containers) => {
    if(networks.length > 0){
        for (const network of networks){
            if(!network.persist){
                try {
                    const containersUsingNetwork = await getAllContainersUsingNetwork(network.networkName, containers);
                    if(containersUsingNetwork.length > 0){
                        console.log(`Unable to delete network ${network.networkName}.  A reusable container requires this network to sustain ${JSON.stringify(containersUsingNetwork, null, 2)}`);
                        continue;
                    }
                    const networkToDelete = docker.getNetwork(network.id);
                    networkToDelete.remove();
                    console.log(`Network ${network.networkName} deleted`);
                }catch (err) {
                    console.error(`Unable to delete Network! ${network.networkName}  ${err}`);
                }
            }
        }
    }
}


module.exports = networkActions;