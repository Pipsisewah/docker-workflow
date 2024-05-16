const fs = require('fs');
const util = require('util');

const workflowComposer = {};

const readFileAsync = util.promisify(fs.readFile);

workflowComposer.createDynamicStateMachineStructure = (workflow) => {
    workflow.workflow.forEach((flow, index) => {
        //console.log(`Reviewing ${JSON.stringify(flow)}`)
        if( index < workflow.length -1) {
            flow.on = {NEXT: workflow[index + 1].name}
        }else{
            flow.on = {end: {type: 'final'}}
        }
    })
    return workflow;
}

workflowComposer.readWorkflow = async (workflowName) => {
    const workflowPath = './workflows/' + workflowName + '.json';
    try {
        // Read the file asynchronously
        const data = await readFileAsync(workflowPath);

        // Parse the JSON data
        const jsonData = JSON.parse(data.toString());
        //console.log('Parsed JSON data:', jsonData);


        return workflowComposer.createDynamicStateMachineStructure(jsonData);
    } catch (error) {
        console.error('An error occurred:', error);
        throw error; // Re-throw the error to handle it outside the function if needed
    }
}




module.exports = workflowComposer;
