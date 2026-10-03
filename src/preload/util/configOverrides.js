//helper functions for overriding internal youtube configs (env, ytcfg, and window.environment which is the source of tectonicConfig)

const functions = require('./functions')

const ytcfgOverrides = []
const environmentOverrides = []

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

function applyOverrides(target, overrides) {
    for (let override of overrides) {
        try {
            functions.deepMerge(target, override)
        } catch (err) {
            console.error('a config override failed', err)
        }
    }
}

let environment;
Object.defineProperty(window, 'environment', {
    configurable: true,
    get() {
        return environment;
    },
    set(value) {
        applyOverrides(value, environmentOverrides)
        environment = value;
    }
})

let ytcfg;
Object.defineProperty(window, 'ytcfg', {
    configurable: true,
    get() {
        return ytcfg;
    },
    set(value) {
        ytcfg = value;

        let set = value?.set;
        if (typeof set !== 'function') return;

        value.set = function (...args) {
            let result = set.apply(this, args)
            if (value.data_) applyOverrides(value.data_, ytcfgOverrides)
            return result;
        }
    }
})

module.exports = {
    overrideEnv,
    ytcfgOverrides,
    environmentOverrides
}