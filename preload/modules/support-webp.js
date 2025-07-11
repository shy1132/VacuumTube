//advertise webp support (disabled by default for ps4 ua)

const configOverrides = require('../util/configOverrides')

module.exports = () => {
    configOverrides.ytcfgOverrides.push({
        INNERTUBE_CONTEXT: {
            client: {
                webpSupport: true
            }
        }
    })
}