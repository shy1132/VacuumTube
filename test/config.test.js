const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const Module = require('node:module')
const test = require('node:test')

function loadConfigManager(t, userData) {
    const originalLoad = Module._load
    Module._load = function (request, ...rest) {
        if (request === 'electron') return { app: { getPath: () => userData } };
        return originalLoad.call(this, request, ...rest);
    }

    const originalSetInterval = global.setInterval;
    global.setInterval = () => 0; //init() starts a save interval

    t.after(() => {
        Module._load = originalLoad
        global.setInterval = originalSetInterval
    })

    const modulePath = require.resolve('../src/config.js')
    delete require.cache[modulePath]
    return require(modulePath);
}

function createUserData(t) {
    const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'vacuumtube-config-'))
    t.after(() => fs.rmSync(userData, { recursive: true, force: true }))
    return userData;
}

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf-8'))

test('creates a default config with overrides when there is none', (t) => {
    const userData = createUserData(t)
    const configManager = loadConfigManager(t, userData)

    const config = configManager.init({ fullscreen: true })

    assert.equal(config.fullscreen, true)
    assert.deepEqual(readJson(path.join(userData, 'config.json')), config)
    assert.equal(fs.existsSync(path.join(userData, 'config.json.tmp')), false)
})

test('backs up an invalid config to .old and falls back to defaults', (t) => {
    const userData = createUserData(t)
    fs.writeFileSync(path.join(userData, 'config.json'), '{ "adblock": false, }') //trailing comma

    const config = loadConfigManager(t, userData).init()

    assert.equal(config.adblock, true)
    assert.equal(fs.readFileSync(path.join(userData, 'config.json.old'), 'utf-8'), '{ "adblock": false, }')
    assert.equal(readJson(path.join(userData, 'config.json')).adblock, true)
})

test('treats null and arrays as invalid', (t) => {
    for (const contents of [ 'null', '[]' ]) {
        const userData = createUserData(t)
        fs.writeFileSync(path.join(userData, 'config.json'), contents)

        const config = loadConfigManager(t, userData).init()

        assert.equal(typeof config.adblock, 'boolean')
        assert.equal(fs.readFileSync(path.join(userData, 'config.json.old'), 'utf-8'), contents)
    }
})

test('keeps existing values and saves defaults for missing keys on init', (t) => {
    const userData = createUserData(t)
    fs.writeFileSync(path.join(userData, 'config.json'), JSON.stringify({ adblock: false }))

    const config = loadConfigManager(t, userData).init()
    const saved = readJson(path.join(userData, 'config.json'))

    assert.equal(config.adblock, false)
    assert.equal(saved.adblock, false)
    assert.equal(saved.sponsorblock_uuid, config.sponsorblock_uuid) //otherwise a new one would be generated every launch

    const relaunched = loadConfigManager(t, userData).init()
    assert.equal(relaunched.sponsorblock_uuid, config.sponsorblock_uuid)
})

test('a failed save is kept and retried', (t) => {
    const userData = createUserData(t)
    const configManager = loadConfigManager(t, userData)
    configManager.init()

    const configFile = path.join(userData, 'config.json')
    const originalRename = fs.renameSync
    fs.renameSync = () => { throw new Error('disk full') }
    t.after(() => { fs.renameSync = originalRename })

    configManager.update({ volume: 42 })
    assert.equal(configManager.save(), false)
    assert.notEqual(readJson(configFile).volume, 42) //the real file is untouched by the failed write

    fs.renameSync = originalRename
    assert.equal(configManager.save(), true)
    assert.equal(readJson(configFile).volume, 42)
})