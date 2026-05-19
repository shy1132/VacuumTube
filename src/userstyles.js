const electron = require('electron')
const path = require('path')
const fs = require('fs')
const chokidar = require('chokidar')

let userstylesDir = null;
let getWindow = () => null;
let watcher = null;

function getUserstyles() {
    const styles = []

    if (!fs.existsSync(userstylesDir)) {
        return styles;
    }

    const files = fs.readdirSync(userstylesDir)

    for (const file of files) {
        if (file.endsWith('.css')) {
            const filePath = path.join(userstylesDir, file)
            try {
                const css = fs.readFileSync(filePath, 'utf-8')
                styles.push({ filename: file, css })
            } catch (err) {
                console.error(`Failed to read userstyle ${file}:`, err)
            }
        }
    }

    return styles;
}

function startWatcher() {
    if (watcher) {
        watcher.close()
    }

    watcher = chokidar.watch(userstylesDir, {
        persistent: true,
        ignoreInitial: true,
        depth: 0
    })

    watcher.on('add', (filePath) => {
        const filename = path.basename(filePath)

        if (!filename.endsWith('.css')) {
            return
        }

        console.log(`[Userstyles] Added: ${filename}`)

        try {
            const css = fs.readFileSync(filePath, 'utf-8')
            const win = getWindow()
            if (win) {
                win.webContents.send('userstyle-updated', { filename, css })
            }
        } catch (err) {
            console.error(`Failed to read new userstyle ${filename}:`, err)
        }
    })

    watcher.on('change', (filePath) => {
        const filename = path.basename(filePath)
        if (!filename.endsWith('.css')) return;

        console.log(`[Userstyles] Changed: ${filename}`)

        try {
            const css = fs.readFileSync(filePath, 'utf-8')
            const win = getWindow()
            if (win) {
                win.webContents.send('userstyle-updated', { filename, css })
            }
        } catch (err) {
            console.error(`Failed to read changed userstyle ${filename}:`, err)
        }
    })

    watcher.on('unlink', (filePath) => {
        const filename = path.basename(filePath)

        if (!filename.endsWith('.css')) return;

        console.log(`[Userstyles] Removed: ${filename}`)

        const win = getWindow()
        if (win) {
            win.webContents.send('userstyle-removed', { filename })
        }
    })

    watcher.on('ready', () => {
        console.log(`[Userstyles] Watcher ready, watching: ${userstylesDir}`)
    })

    watcher.on('error', (err) => {
        console.error('[Userstyles] Watcher error:', err)
    })

    console.log(`[Userstyles] Setting up watcher for: ${userstylesDir}`)
}

function setup(options = {}) {
    getWindow = options.getWindow || (() => null)
    userstylesDir = path.join(options.userData, 'userstyles')

    if (!fs.existsSync(userstylesDir)) {
        fs.mkdirSync(userstylesDir, { recursive: true })
        console.log(`[Userstyles] Created userstyles directory: ${userstylesDir}`)
    }

    electron.ipcMain.on('get-userstyles-path', (event) => {
        event.returnValue = userstylesDir;
    })

    electron.ipcMain.handle('get-userstyles', () => {
        return getUserstyles();
    })

    electron.ipcMain.handle('open-userstyles-folder', () => {
        electron.shell.openPath(userstylesDir)
    })
}

module.exports = {
    setup,
    startWatcher
}