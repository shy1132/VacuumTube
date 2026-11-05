const rcMod = require('../util/resolveCommandModifiers')
const configManager = require('../config')
const config = configManager.get()

module.exports = () => {
    if (!config.default_guest_mode) return;

    rcMod.resolveCommand({
        switchToGuestMode: {
            identityType: 'UNAUTHENTICATED_IDENTITY_TYPE_GUEST'
        }
    })
}