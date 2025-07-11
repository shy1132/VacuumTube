//when it sends an EXIT_APP command, youtube bugs out sometimes, and may not exit. this fixes that

const rcMod = require('../util/resolveCommandModifiers')

module.exports = () => {
    rcMod.addInputModifier((command) => {
        if (!command.commandExecutorCommand || !command.commandExecutorCommand.commands) return command;

        let exitCommand = command.commandExecutorCommand.commands.find(c => c.signalAction?.signal === 'EXIT_APP')
        if (!exitCommand) return command;

        window.close()
        return false;
    })
}