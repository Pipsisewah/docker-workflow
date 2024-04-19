import { createMachine, createActor, assign } from 'xstate';
import dockerControl from './start.js'

// State machine
const toggleMachine = createMachine({
    id: 'toggle',
    initial: 'inactive',
    context: {
        count: 0
    },
    states: {
        inactive: {
            on: {
                TOGGLE: { target: 'active' }
            }
        },
        active: {
            entry: dockerControl.startContainer,
            on: {
                TOGGLE: { target: 'inactive' }
            }
        }
    }
});

// Actor (instance of the machine logic, like a store)
const toggleActor = createActor(toggleMachine);
toggleActor.subscribe((state) => console.log(state.value, state.context));
toggleActor.start();
// => logs 'inactive', { count: 0 }

toggleActor.send({ type: 'TOGGLE' });
// => logs 'active', { count: 1 }

toggleActor.send({ type: 'TOGGLE' });
// => logs 'inactive', { count: 1 }