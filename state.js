const fs = require('fs').promises;

let changed = false;
let state = {}

let defaults = {
    fullscreen: false
}

async function init(stateFile, overrides = {}) {
    if (await fileExists(stateFile) && await isValidJson(stateFile)) {
        state = JSON.parse(await fs.readFile(stateFile, 'utf-8'))
    } else {
        console.log('initializing default state')

        state = {
            ...defaults,
            ...overrides
        }

        try {
            await fs.writeFile(stateFile, JSON.stringify(state))
        } catch (err) {
            console.error('failed to write state file', err)
        }
    }

    setInterval(async () => {
        if (changed) {
            console.log('saving updated state to file')

            try {
                await fs.writeFile(stateFile, JSON.stringify(state))
                return true;
            } catch (err) {
                console.error('failed to write state file', err)
                return false;
            } finally {
                changed = false;
            }
        }
    }, 2500)

    return state;
}

async function update(state = {}) {
    state = {
        ...defaults,
        state
    }

    changed = true;
}

async function fileExists(file) {
    try {
        await fs.stat(file)
        return true;
    } catch {
        return false;
    }
}

async function isValidJson(file) {
    try {
        let text = await fs.readFile(file, 'utf-8')
        let json = JSON.parse(text)
        if (typeof json != 'object') throw new Error('not an object');
        return true;
    } catch {
        return false;
    }
}

module.exports.init = init;
module.exports.update = update;