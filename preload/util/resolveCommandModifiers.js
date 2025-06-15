//overriding youtube's resolveCommand so we can have unlimited power (mainly for hooking into settings and ui)

const inputModifiers = []
const outputModifiers = []

let globalResolveCommand;

let interval = setInterval(() => { //try over and over again to find it (shouldn't take long)
    for (let key in window._yttv) {
        if (window._yttv[key]?.instance?.resolveCommand) {
            let resolveCommand = window._yttv[key].instance.resolveCommand;
            globalResolveCommand = (command) => { //for some reason, this function doesn't work unless i do it like this (instead of just setting it directly to the actual function)
                return window._yttv[key].instance.resolveCommand(command);
            }

            window._yttv[key].instance.resolveCommand = function (command) {
                for (let modifier of inputModifiers) {
                    command = modifier(command)
                    if (command === false) return true; //blocking, doesn't allow internal handler to get to it
                }

                let output = resolveCommand.apply(this, [ command ])

                for (let modifier of outputModifiers) {
                    output = modifier(output)
                }

                return output;
            }

            clearInterval(interval)
            return;
        }
    }
}, 100)

function addInputModifier(func) {
    inputModifiers.push(func)
}

function addOutputModifier(func) {
    outputModifiers.push(func)
}

module.exports = {
    resolveCommand: (command) => {
        if (globalResolveCommand) {
            return globalResolveCommand(command);
        } else {
            throw new Error('resolveCommand doesn\'t exist yet, probably called too early');
        }
    },
    addInputModifier,
    addOutputModifier
}