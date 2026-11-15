//overriding youtube's resolveCommand so we can have unlimited power (mainly for hooking into settings and ui)

const functions = require('./functions')

const inputModifiers = []
const outputModifiers = []

let globalResolveCommand;

let interval = setInterval(() => { //try over and over again to find it (shouldn't take long)
    for (let key in window._yttv) {
        if (window._yttv[key]?.instance?.resolveCommand) {
            let resolveCommand = window._yttv[key].instance.resolveCommand;
            globalResolveCommand = (...args) => { //for some reason, this function doesn't work unless i do it like this (instead of just setting it directly to the actual function)
                return window._yttv[key].instance.resolveCommand(...args);
            }

            window._yttv[key].instance.resolveCommand = function (command, ...rest) {
                for (let modifier of inputModifiers) {
                    command = modifier(command)
                    if (command === false) return true; //blocking, doesn't allow internal handler to get to it
                }

                let output = resolveCommand.apply(this, [ command, ...rest ])

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
        if (!globalResolveCommand) {
            functions.waitForCondition(() => globalResolveCommand)
            .then(() => globalResolveCommand(command))
        }
    },
    addInputModifier,
    addOutputModifier
}
