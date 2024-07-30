
const workflowUtils = {};

workflowUtils.findContainerContext = (context, action) => {
    return context.containers.find(container => container.containerName === action.container);
}

workflowUtils.findNetworkContext = (context, networkName) => {
    return context.networks.find(network => network.networkName === networkName);
}

module.exports = workflowUtils;