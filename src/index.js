require('dotenv').config();
const express = require('./api/index');
const dockerConfig = require('./dockerConfig');
const Workflow = require('./Workflow');
const DEFAULT_WORKFLOW_NAME = 'base';
const DEFAULT_APEX_DOMAIN = 'slopesprogramming.com';
const DEFAULT_DB_URL = 'mongodb:27017';
const DEFAULT_DOCKER_CONFIG = "";
const DEFAULT_PROJECT_LOCATION = "projects/scanner"

async function main() {
    const workflowName = process.env.PROJECT_NAME || DEFAULT_WORKFLOW_NAME;
    const apexDomain = process.env.APEX_DOMAIN || DEFAULT_APEX_DOMAIN;
    const dbURL = process.env.DB_URL || DEFAULT_DB_URL;
    const dockerConfigSettings = process.env.DOCKER_CONFIG || DEFAULT_DOCKER_CONFIG;
    const defaultProjectLocation = process.env.DEFAULT_PROJECT_LOCATION || DEFAULT_PROJECT_LOCATION;
    const expressServer = express.start(3000);``
    const debug = true;
    dockerConfig.init(dockerConfigSettings);
    const mainWorkflow = new Workflow({workflowName, envVariables: {apexDomain, dbURL, defaultProjectLocation}, debug, source: defaultProjectLocation}, expressServer);
    await mainWorkflow.start();
}

main().then(() => {
    console.log('Main function completed!');
}).catch(error => {
    console.error(`Error!, ${error}`);
});

