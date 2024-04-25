const mainStateMachine = {
    id: 'dockerScript',
    initial: 'pullingImages',
    context: {
        mongoDBContainer: null,
        nginxContainer: null
    },
    states: {
        pullingImages: {
            invoke: {
                src: 'pullImages',
                onDone: 'startingMongoDB'
            }
        },
        startingMongoDB: {
            invoke: {
                src: 'startMongoDB',
                onDone: 'checkingMongoDB'
            }
        },
        checkingMongoDB: {
            invoke: {
                src: 'checkMongoDBReady',
                onDone: 'startingNginx'
            }
        },
        startingNginx: {
            invoke: {
                src: 'startNginx',
                onDone: 'connectingAndInsertingDocument'
            }
        },
        connectingAndInsertingDocument: {
            invoke: {
                src: 'connectAndInsertDocument',
                onDone: {
                    target: 'running',
                }
            }
        },
        running: {
            type: 'final'
        }
    }
}

module.exports = mainStateMachine;