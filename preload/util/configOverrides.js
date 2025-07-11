//helper functions for overriding internal youtube configs (env, ytcfg, window.environment, and tectonicConfig)

const functions = require('./functions')

const ytcfgOverrides = []
const environmentOverrides = []
const tectonicConfigOverrides = []

function overrideEnv(key, value) {
    let params = new URLSearchParams(window.location.search)
    params.set(String(key), String(value))

    let newUrl = window.location.pathname + '?' + params.toString()
    history.replaceState(null, '', newUrl)
}

let ytcfgInterval = setInterval(() => {
    if (!window.ytcfg) return;
    if (ytcfgOverrides.length === 0) return;

    while (ytcfgOverrides.length > 0) {
        let override = ytcfgOverrides.shift()
        functions.deepMerge(window.ytcfg.data_, override)
        window.ytcfg.set(window.ytcfg.data_)
    }
})

let environmentInterval = setInterval(() => {
    if (!window.environment) return;
    if (environmentOverrides.length === 0) return;

    while (environmentOverrides.length > 0) {
        let override = environmentOverrides.shift()
        functions.deepMerge(window.environment, override)
    }
})

let tectonicConfigInterval = setInterval(() => {
    if (!window.tectonicConfig) return;
    if (tectonicConfigOverrides.length === 0) return;

    while (tectonicConfigOverrides.length > 0) {
        let override = tectonicConfigOverrides.shift()
        functions.deepMerge(window.tectonicConfig, override)
    }
})

module.exports = {
    overrideEnv,
    ytcfgOverrides,
    environmentOverrides,
    tectonicConfigOverrides
}