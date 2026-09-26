//helper functions for overriding internal youtube configs (env, ytcfg, window.environment, and tectonicConfig)

const functions = require('./functions')

const ytcfgOverrides = []
const environmentOverrides = []
const tectonicConfigOverrides = []

function overrideEnv(key, value) {
    let params = new URLSearchParams(window.location.search)

    key = String(key)
    value = String(value)

    let existing = params.has(key)
    if (existing) {
        if (value === existing) return;
        params.delete(key)
    }

    params.set(key, value)

    let newUrl = window.location.pathname + '?' + params.toString()
    history.replaceState(null, '', newUrl)
}

function applyWhenAvailable(queue, getTarget, apply) {
    let interval = setInterval(() => {
        let target = getTarget()
        if (!target) return;

        clearInterval(interval)

        for (let override of queue) {
            apply(target, override)
        }
    })
}

applyWhenAvailable(ytcfgOverrides, () => window.ytcfg, (ytcfg, override) => {
    functions.deepMerge(ytcfg.data_, override)
    ytcfg.set(ytcfg.data_)
})

applyWhenAvailable(environmentOverrides, () => window.environment, (environment, override) => {
    functions.deepMerge(environment, override)
})

applyWhenAvailable(tectonicConfigOverrides, () => window.tectonicConfig, (tectonicConfig, override) => {
    functions.deepMerge(tectonicConfig, override)
})

module.exports = {
    overrideEnv,
    ytcfgOverrides,
    environmentOverrides,
    tectonicConfigOverrides
}