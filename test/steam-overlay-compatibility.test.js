const test = require('node:test')
const assert = require('node:assert/strict')

const {
    isSteamOverlayCompatibilitySupported,
    getCompatibilitySwitches,
    applySteamOverlayCompatibilitySwitches
} = require('../src/steam-overlay-compatibility')

test('steam overlay compatibility is supported only on Windows', () => {
    assert.equal(isSteamOverlayCompatibilitySupported('win32'), true)
    assert.equal(isSteamOverlayCompatibilitySupported('linux'), false)
    assert.equal(isSteamOverlayCompatibilitySupported('darwin'), false)
})

test('steam overlay compatibility has no startup switches outside Windows', () => {
    assert.deepEqual(getCompatibilitySwitches('linux'), [])
    assert.deepEqual(getCompatibilitySwitches('darwin'), [])
})

test('steam overlay compatibility applies the Windows switch bundle when enabled', () => {
    const appended = []
    const commandLine = {
        hasSwitch: () => false,
        appendSwitch: (name) => appended.push(name)
    }

    const applied = applySteamOverlayCompatibilitySwitches({
        commandLine,
        config: { steam_overlay_compatibility: true },
        platform: 'win32',
        logger: silentLogger()
    })

    assert.deepEqual(applied, [
        'in-process-gpu',
        'disable-direct-composition'
    ])
    assert.deepEqual(appended, applied)
})

test('steam overlay compatibility does not apply switches while disabled', () => {
    const appended = []

    const applied = applySteamOverlayCompatibilitySwitches({
        commandLine: {
            hasSwitch: () => false,
            appendSwitch: (name) => appended.push(name)
        },
        config: { steam_overlay_compatibility: false },
        platform: 'win32',
        logger: silentLogger()
    })

    assert.deepEqual(applied, [])
    assert.deepEqual(appended, [])
})

test('steam overlay compatibility does not duplicate existing command-line switches', () => {
    const existing = new Set(['in-process-gpu'])
    const appended = []

    const applied = applySteamOverlayCompatibilitySwitches({
        commandLine: {
            hasSwitch: (name) => existing.has(name),
            appendSwitch: (name) => {
                existing.add(name)
                appended.push(name)
            }
        },
        config: { steam_overlay_compatibility: true },
        platform: 'win32',
        logger: silentLogger()
    })

    assert.deepEqual(applied, ['disable-direct-composition'])
    assert.deepEqual(appended, applied)
})

function silentLogger() {
    return {
        log: () => {},
        warn: () => {}
    }
}
