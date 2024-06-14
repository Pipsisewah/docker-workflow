const Docker = require("dockerode");
const docker = new Docker();

const networkActions = {};

networkActions.doesNetworkExist = async (networkName) => {
    try {
        const networks = await docker.listNetworks();
        return networks.find(net => net.Name === networkName);
    } catch (err) {
        console.error('Error listing networks:', err);
    }
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
    } catch (err) {
        console.error('Error creating network:', err);

    }
}


module.exports = networkActions;