// Keep YouTube's native TV/Cobalt identity consistent with the renderer and
// playback requests. Rewriting it as Desktop Chrome can make BotGuard see
// several different clients in one session.

const os = require('os')
const configOverrides = require('../util/configOverrides')

function castEnvironmentOverride(hostname = os.hostname(), platform = process.platform) {
    if (platform === 'darwin' && hostname.endsWith('.local')) {
        hostname = hostname.slice(0, -6)
    }

    return {
        feature_switches: {
            mdx_device_label: `${hostname} (VacuumTube)`
        }
    };
}

module.exports = () => {
    configOverrides.environmentOverrides.push(castEnvironmentOverride())
}

module.exports.castEnvironmentOverride = castEnvironmentOverride;
