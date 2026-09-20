//blocks the "Video paused. Continue watching?" prompt that shows up after being idle for a while

const jsonMod = require('../util/jsonModifiers')
const configManager = require('../config')
const config = configManager.get()

module.exports = () => {
    jsonMod.addModifier((json) => {
        if (!config.block_continue_watching) return json;

        if ('playabilityStatus' in json && 'messages' in json) {
            json.messages = json.messages.filter(m => !m?.youThereRenderer)
            if (json.messages.length === 0) delete json.messages;

            return json;
        } else {
            return json;
        }
    })
}