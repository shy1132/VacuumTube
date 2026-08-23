const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const test = require('node:test')

const {
    resetAfterAppUpdate,
    resetMicrophonePermission,
    versionMarkerName
} = require('../src/microphone-permission-reset.js')

const silentLogger = {
    error() {},
    log() {}
}

function createUserData(t) {
    const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'vacuumtube-permissions-'))
    t.after(() => fs.rmSync(userData, { recursive: true, force: true }))
    return userData;
}

function macOptions(userData, appVersion = '1.8.2') {
    return {
        appId: 'rocks.shy.VacuumTube',
        appVersion,
        isPackaged: true,
        platform: 'darwin',
        userData
    };
}

test('resets only the VacuumTube microphone decision with tccutil', async () => {
    let command = null;
    let args = null;

    await resetMicrophonePermission('rocks.shy.VacuumTube', (receivedCommand, receivedArgs, callback) => {
        command = receivedCommand;
        args = receivedArgs;
        callback(null)
    })

    assert.equal(command, '/usr/bin/tccutil')
    assert.deepEqual(args, [ 'reset', 'Microphone', 'rocks.shy.VacuumTube' ])
})

test('resets microphone permission on the first packaged macOS launch', async (t) => {
    const userData = createUserData(t)
    const resetCalls = []

    const didReset = await resetAfterAppUpdate(macOptions(userData), {
        logger: silentLogger,
        resetMicrophonePermission: async (appId) => resetCalls.push(appId)
    })

    assert.equal(didReset, true)
    assert.deepEqual(resetCalls, [ 'rocks.shy.VacuumTube' ])
    assert.equal(fs.readFileSync(path.join(userData, versionMarkerName), 'utf-8'), '1.8.2\n')
})

test('does not reset again while the app version is unchanged', async (t) => {
    const userData = createUserData(t)
    const marker = path.join(userData, versionMarkerName)
    fs.writeFileSync(marker, '1.8.2\n')

    let resetCount = 0;
    const didReset = await resetAfterAppUpdate(macOptions(userData), {
        logger: silentLogger,
        resetMicrophonePermission: async () => resetCount++
    })

    assert.equal(didReset, false)
    assert.equal(resetCount, 0)
})

test('resets once when the packaged app version changes', async (t) => {
    const userData = createUserData(t)
    const marker = path.join(userData, versionMarkerName)
    fs.writeFileSync(marker, '1.8.1\n')

    let resetCount = 0;
    const didReset = await resetAfterAppUpdate(macOptions(userData), {
        logger: silentLogger,
        resetMicrophonePermission: async () => resetCount++
    })

    assert.equal(didReset, true)
    assert.equal(resetCount, 1)
    assert.equal(fs.readFileSync(marker, 'utf-8'), '1.8.2\n')
})

test('leaves development runs and other platforms untouched', async (t) => {
    const userData = createUserData(t)
    let resetCount = 0;
    const dependencies = {
        logger: silentLogger,
        resetMicrophonePermission: async () => resetCount++
    };

    const developmentReset = await resetAfterAppUpdate({
        ...macOptions(userData),
        isPackaged: false
    }, dependencies)
    const windowsReset = await resetAfterAppUpdate({
        ...macOptions(userData),
        platform: 'win32'
    }, dependencies)

    assert.equal(developmentReset, false)
    assert.equal(windowsReset, false)
    assert.equal(resetCount, 0)
    assert.equal(fs.existsSync(path.join(userData, versionMarkerName)), false)
})

test('records a failed reset attempt so it does not loop on every launch', async (t) => {
    const userData = createUserData(t)
    let resetCount = 0;
    const dependencies = {
        logger: silentLogger,
        resetMicrophonePermission: async () => {
            resetCount++
            throw new Error('tccutil failed')
        }
    };

    const firstReset = await resetAfterAppUpdate(macOptions(userData), dependencies)
    const secondReset = await resetAfterAppUpdate(macOptions(userData), dependencies)

    assert.equal(firstReset, false)
    assert.equal(secondReset, false)
    assert.equal(resetCount, 1)
})

test('does not reset when it cannot save the version marker', async (t) => {
    const userData = createUserData(t)
    const invalidUserData = path.join(userData, 'not-a-directory')
    fs.writeFileSync(invalidUserData, 'file')

    let resetCount = 0;
    const didReset = await resetAfterAppUpdate(macOptions(invalidUserData), {
        logger: silentLogger,
        resetMicrophonePermission: async () => resetCount++
    })

    assert.equal(didReset, false)
    assert.equal(resetCount, 0)
})
