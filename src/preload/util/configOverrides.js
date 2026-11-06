//helper functions for overriding internal youtube configs (env, ytcfg, and window.environment which is the source of tectonicConfig)

const functions = require('./functions')

const ytcfgOverrides = []
const environmentOverrides = []

function overrideEnv(key, value) {
    let url = new URL(window.location.href)

    key = String(key)
    value = String(value)

    if (url.searchParams.get(key) === value) return;

    url.searchParams.set(key, value)
    history.replaceState(null, '', url)
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