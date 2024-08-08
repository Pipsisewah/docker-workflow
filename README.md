# Overview

## Project Structure
- projects
  - 'your project folder'
    - containers
      - 'your container folder'
        - Dockerfile
    - workflow.json


## Overall Project Orchestration
- We are using [xstate](https://xstate.js.org/) version 4 as a state machine to organize workflows
- You can read their documentation [here](https://stately.ai/docs/xstate-v4/studio) for more information
- Projects can execute other projects within their workflow

## Project Components
### Container
- Creates a docker container with the provided settings
- Expects a Dockerfile to exist within the following location
```
- projects
  - <my project>
    - containers
      - <my container>
        - Dockerfile
```
- Once the container is finished, typically it will stop
- Once a workflow is completed, any containers created from that workflow will be deleted unless specified otherwise

### Network
- Networks are required if you want to allow containers to communicate with each other
- If your main mongoDB storage for holder scan results will exist within a container, you will need to create a network for your containers

### Volume
- Volumes are virtual hard drives which can be attached to one or more containers
- This is helpful if you want to share large amounts of data or simply share script output data that exists in a file
- Unless otherwise specified, volumes are ephemeral and will be deleted once the workflow is complete as long as it is not still attached to a container

### Workflow
- Workflows can execute other workflows by referencing the project name
```json
"type": "runWorkflow",
"workflowName": "projectName",
```


## Flags
### Workflow
- skip (optional)
  - If this flag is set to `true`, the entire workflow will be skipped
  - This is useful if you are trying to debug
- source (optional)
  - Defines where to look for this workflow
  - Useful if you have private workflows not included in the application
  - Example project named "MyProject":
    - "source": "externalProjects"
    - This will look for a project in `<application_root>/externalProjects/MyProject`
### Container
- await
  - Workflow will not continue until the host machine is able to contact the target container.  The system will look at which port is exposed and based on some rules, will attempt to connect.  Special code is given to connect via MongoDB, but will default to HTTP fetch if any other port is given.
- reuse
  - Once the workflow is complete, typically containers are stopped and deleted.  If reuse is set to true, the container will not be shut down or deleted, but instead will remain.  On start, the workflow will look to see if the container already exists, and if it does, it will reuse the container.
### Network
- persist
  - On Workflow end, the system will attempt to cleanup each network created in the Workflow but will skip those with this flag set to `true`
### Volume
- persist
  - On Workflow end, the system will attempt to cleanup each volume created in the Workflow but will skip those with this flag set to `true`


## Running A Project
- When running this application, you will provide at least 3 variables in the `.env` file
  - PROJECT_NAME - The project in the `projects` folder you want to run
  - APEX_DOMAIN = The domain you want to target
  - DB_URL = The URL:PORT of the mongoDB where result data should be stored
- Use `npm run start` to execute the project
- 

Project Details
- id - Just leave this alone for now, we're not really using it
- initial - This is the name of state you want to start with