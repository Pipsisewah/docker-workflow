const workflowComposer = require('./workflowComposer');

const workflow = workflowComposer.readWorkflow('firstWorkflow').then((workflow) => {
    if(workflow.meta.type === 'failure'){
        console.log('Failed to import workflow');
        console.log(workflow.meta.type);
        return;
    }

    for (const step of workflow.workflow){
        console.log(step);
        
    }


})


