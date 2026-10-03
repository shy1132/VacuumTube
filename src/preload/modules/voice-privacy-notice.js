//enables a switch that adds a Microphone Access button to settings, and tells the user about the privacy policy when first enabling it

const configOverrides = require('../util/configOverrides')

module.exports = () => {
    if (process.platform === 'darwin') return;

    configOverrides.environmentOverrides.push({
        feature_switches: {
            has_samsung_voice_privacy_notice: true
        }
    })
}