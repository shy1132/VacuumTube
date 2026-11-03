const configManager = require('../../../config')
const keybindings = require('../../../util/keybindings')

let refreshPage = () => {}
let capturing = null;

module.exports = {
    id: 'keybinds',

    title: (locale) => locale.keybinds.title,
    description: (locale) => locale.keybinds.description,

    sections: (config, locale) => {
        function capture(type, actionId) {
            capturing = { type, actionId }
            keybindings.startCapture(type, (value) => {
                if (type === 'controller') {
                    const bindings = { ...(configManager.get().controller_bindings || {}) }

                    if (value !== null) {
                        for (const action of keybindings.actions) {
                            if (action.id !== actionId && keybindings.getControllerBinding(action.id) === value) {
                                bindings[action.id] = null;
                            }
                        }
                    }

                    bindings[actionId] = value;
                    configManager.set({ controller_bindings: bindings })
                } else {
                    const bindings = { ...(configManager.get().keyboard_bindings || {}) }

                    if (value !== null) {
                        for (const action of keybindings.actions) {
                            const binding = keybindings.getKeyboardBinding(action.id)
                            if (action.id !== actionId && binding?.code === value.code &&
                                [ 'ctrl', 'alt', 'shift', 'meta' ].every((modifier) => !!binding[modifier] === value[modifier])) {
                                bindings[action.id] = null;
                            }
                        }
                    }

                    bindings[actionId] = value;
                    configManager.set({ keyboard_bindings: bindings })
                }

                capturing = null;
                refreshPage()
            }, () => {
                capturing = null;
                refreshPage()
            })
        }

        function rows(type, label) {
            return keybindings.actions.map((action) => {
                const active = capturing?.type === type && capturing.actionId === action.id;
                const current = type === 'keyboard'
                    ? keybindings.displayKeyboardBinding(action.id)
                    : keybindings.displayControllerBinding(action.id)
                const value = active
                    ? (type === 'keyboard' ? locale.keybinds.press_key : locale.keybinds.press_button)
                    : current

                return {
                    type: 'button',
                    id: `${type}-${action.id}`,
                    title: `${locale.keybinds.actions[action.id]} — ${label}`,
                    description: value,
                    run: () => capture(type, action.id)
                }
            })
        }

        return [
            { title: locale.keybinds.keyboard, rows: rows('keyboard', locale.keybinds.keyboard) },
            { title: locale.keybinds.controller, rows: rows('controller', locale.keybinds.controller) },
            {
                rows: [
                    {
                        type: 'button',
                        id: 'reset-keybinds',
                        title: locale.keybinds.reset,
                        run: () => configManager.set({ keyboard_bindings: {}, controller_bindings: {} })
                    }
                ]
            }
        ]
    },

    onOpen({ refresh }) {
        refreshPage = refresh;
    },

    onClose() {
        capturing = null;
        keybindings.cancelCapture()
        refreshPage = () => {}
    }
}
