const rcMod = require('../util/resolveCommandModifiers')

module.exports = () => {
    rcMod.addInputModifier((c) => {
        if (c.openPopupAction?.uniqueId === 'playback-cap') return false;
        return c;
    })
}