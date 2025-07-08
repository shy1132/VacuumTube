//configures various flags and feature switches with some helpful values for VacuumTube

module.exports = () => {
    let switches = {
        hasSamsungVoicePrivacyNotice: true, //adds a Microphone Access button to settings, and tells the user about the privacy policy when first enabling it
        showApkVersion: true //grabs the first version number it sees in the user agent (which happens to be VacuumTube's), and shows that in the "App version" settings page
    }

    let flags = {}

    let environmentInterval = setInterval(() => {
        if (!window.environment) return;
        if (!window.environment.flags) return;

        window.environment.flags = {
            ...window.environment.flags,
            ...flags
        }

        clearInterval(environmentInterval)
    })

    let ytcfgInterval = setInterval(() => {
        if (!window.ytcfg) return;

        ytcfg.set('EXPERIMENT_FLAGS', {
            ...ytcfg.data_.EXPERIMENT_FLAGS,
            ...flags
        })

        clearInterval(ytcfgInterval)
    })

    let switchesInterval = setInterval(() => {
        if (!window.tectonicConfig) return;
        if (!window.tectonicConfig.featureSwitches) return;

        window.tectonicConfig.featureSwitches = {
            ...window.tectonicConfig.featureSwitches,
            ...switches
        }

        clearInterval(switchesInterval)
    })
}