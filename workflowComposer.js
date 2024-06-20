const fs = require('fs');
const util = require('util');
const {Machine, interpret, assign, send, sendParent} = require("xstate");
const dockerActions = require("./actions/dockerActions");
const containerValidation = require("./actions/containerValidation");
const {volumeActions, networkActions, containerActions} = require("./actions/dockerActions");
const workflowComposer = {};
const readFileAsync = util.promisify(fs.readFile);












module.exports = workflowComposer;
