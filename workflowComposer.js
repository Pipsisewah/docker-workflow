const fs = require('fs');
const util = require('util');
const workflowComposer = {};

const readFileAsync = util.promisify(fs.readFile);

workflowComposer.readWorkflow = async (workflowName) => {
    const workflowPath = './workflows/' + workflowName + '.json';
    try {
        const data = await readFileAsync(workflowPath);
        const jsonData = JSON.parse(data.toString());
        return jsonData;
    } catch (error) {
        console.error('An error occurred:', error);
        throw error; // Re-throw the error to handle it outside the function if needed
    }
}




module.exports = workflowComposer;
