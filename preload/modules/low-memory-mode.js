//force limited-memory if low_memory_mode is enabled

const configManager = require('../config')
const configOverrides = require('../util/configOverrides')

module.exports = () => {
    let config = configManager.get()

    if (config.low_memory_mode) {
        configOverrides.environmentOverrides.push({
            feature_switches: {
                enable_memory_saving_mode: true
            }
        })
    }
}