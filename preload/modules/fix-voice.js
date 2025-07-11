//fix voice search

const configOverrides = require('../util/configOverrides')

module.exports = () => {
    configOverrides.overrideEnv('env_enableMediaStreams', true)
}