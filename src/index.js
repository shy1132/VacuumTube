//initialization
const electron = require('electron')
const { autoUpdater } = require('electron-updater')
const path = require('path')
const fs = require('fs')
const http = require('http')
const minimist = require('minimist')
const stringArgv = require('string-argv')
const package = require('../package.json')

const appId = package.build?.appId || 'rocks.shy.VacuumTube'

const argv = minimist(process.argv)

electron.app.setName('VacuumTube')

let userData = electron.app.getPath('userData')

let portablePath = portable()
if (portablePath) {
    electron.app.setPath('userData', portablePath)
    userData = electron.app.getPath('userData')
}

const sessionData = path.join(userData, 'sessionData')
electron.app.setPath('sessionData', sessionData)

const configManager = require('./config.js')
const permissions = require('./permissions.js')
const userstyles = require('./userstyles.js')

//code
/*
about the user agent:
leanback is extremely weird about user agents, a lot of ones do really different things for no reason. i can't imagine what the backend code looks like for this
but, this is using the most optimal one i've been able to create

Mozilla/5.0 makes youtube think it's a "DESKTOP" device
(PS4; Leanback Shell) is part of the user agent of the ps4 youtube app, i chose ps4 because it's the most versatile in this situation since it gives the most up-to-date ui
Cobalt/25.lts.40.1035033 is a fairly new cobalt version, cobalt is the browser the tv youtube app tends to run in internally, using the latest seems to trigger playback issues
ON CLIENT SIDE: Cobalt/19.lts.0-qa is an older cobalt version so that youtube doesn't automatically assume widevine is supported
the actual ps4 ua has more to it, but this is all that's needed for it to work here
the "compatible" and "VacuumTube" part are just for transparency's sake, and to make sure they can detect it so i'm not screwing up any internal logging/analytics

this is only used because you have to have a good user agent to be "allowed" onto leanback, and many innertube endpoints check the user agent specifically to know what to send (e.g. high quality thumbnails)
VacuumTube overrides some things to identify properly, but this user agent has to be sent with every request to youtube sadly
*/
const youtubeClientUserAgent = `Mozilla/5.0 (PS4; Leanback Shell) Cobalt/19.lts.0-qa; compatible; VacuumTube/${package.version}`
const youtubeUserAgent = `Mozilla/5.0 (PS4; Leanback Shell) Cobalt/25.lts.40.1035033; compatible; VacuumTube/${package.version}`
const userAgent = `VacuumTube/${package.version}` //for anything else

const youtubeUrl = 'https://www.youtube.com/tv'
const runningOnSteam = process.env.SteamOS === '1' && process.env.SteamGamepadUI === '1'

let win;
let config;
let previewView; //WebContentsView for the autoplay preview feature, see setup below
let previewServer; //local http server that serves the autoplay preview's embed wrapper page, see setup below
let previewServerPort; //port previewServer ended up listening on
let previewServerFailed = false; //set if startPreviewServer() couldn't bind a port - the feature is then silently treated as unavailable rather than crashing startup

async function main() {
    if (argv['version'] || argv['v']) {
        process.stdout.write(`VacuumTube ${package.version}\n`, () => { //console.log then process.exit isn't safe since console.log is async, so that's why it's done with process.stdout instead
            process.exit(0)
        })

        return;
    }

    if (runningOnSteam) {
        electron.app.commandLine.appendSwitch('--no-sandbox') //won't run without this in game mode for me
    }

    config = configManager.init({
        fullscreen: !!runningOnSteam //if running on steam in game mode, override fullscreen to be on by default (note that this was broken from 1.3.0 until 1.3.6 due to config bug)
    })

    const flagsPath = path.join(userData, 'flags.txt')
    if (fs.existsSync(flagsPath)) {
        let extraFlags = fs.readFileSync(flagsPath, 'utf-8').trim()
        let arg = stringArgv.parseArgsStringToArgv(extraFlags)
        let parsed = minimist(arg)

        for (let [key, value] of Object.entries(parsed)) {
            if (key === '_') {
                continue;
            }

            electron.app.commandLine.appendSwitch(key, value)
        }
    }

    let enabledFeatures = electron.app.commandLine.getSwitchValue('enable-features').split(',')
    let disabledFeatures = electron.app.commandLine.getSwitchValue('disable-features').split(',')

    if (process.platform === 'linux' && !config.wayland_hdr) {
        disabledFeatures.push('WaylandWpColorManagerV1') //colors on wayland are super washed out in newer chromium versions for some reason, but this seems to fix it
    }

    if (!config.hardware_decoding) {
        electron.app.disableHardwareAcceleration()
    } else {
        enabledFeatures.push('AcceleratedVideoEncoder')
        enabledFeatures.push('AcceleratedVideoDecoder')

        if (process.platform === 'linux') {
            enabledFeatures.push('AcceleratedVideoDecodeLinuxGL')
            enabledFeatures.push('AcceleratedVideoDecodeLinuxZeroCopyGL')
        }
    }

    enabledFeatures = [...new Set(enabledFeatures.filter(f => f))]
    disabledFeatures = [...new Set(disabledFeatures.filter(f => f && !enabledFeatures.includes(f)))]

    if (enabledFeatures.length > 0) {
        electron.app.commandLine.appendSwitch('enable-features', enabledFeatures.join(','))
    }

    if (disabledFeatures.length > 0) {
        electron.app.commandLine.appendSwitch('disable-features', disabledFeatures.join(','))
    }

    electron.app.on('window-all-closed', () => {
        if (process.platform !== 'darwin') electron.app.quit()
    })

    electron.app.on('before-quit', () => {
        configManager.save()
        if (previewServer) previewServer.close()
    })

    //the autoplay preview feature's local http server and WebContentsView (see startPreviewServer()/getPreviewView()
    //below) are only ever created if the feature was enabled at app startup - checked once here, rather than
    //created unconditionally on every launch, so nothing extra is spun up for people who don't use this feature.
    //this does mean toggling the setting on requires restarting VacuumTube to actually take effect (surfaced to
    //the user via the setting's description in locale/en.json), since nothing here reacts to a live config change.
    const autoplayPreviewEnabled = config.features_enabled === true && config.autoplay_preview_feature === true;

    await electron.app.whenReady()

    if (autoplayPreviewEnabled) {
        try {
            await startPreviewServer()
        } catch (err) {
            //failing to bind a loopback port is unusual but not fatal to the rest of the app - just log it and
            //leave the feature inert for this run rather than letting the rejection propagate out of main()
            console.error('[autoplay-preview] Failed to start local preview server, feature disabled for this session:', err)
            previewServerFailed = true;
        }
    }

    autoUpdater.checkForUpdatesAndNotify()
    permissions.setup({ appId })

    //general request modification
    electron.session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
        let url = new URL(details.url)
        if (url.host === 'csp.withgoogle.com') return callback({ cancel: true }); //electron refuses to modify or remove the Report-To header, so i just block csp by domain. they have specific csp endpoints for the cobalt engine, and i don't wanna mess with those analytics

        callback({ cancel: false })
    })

    //general response modification
    electron.session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
        let url = new URL(details.url)
        if (url.host !== 'www.youtube.com') return callback({ cancel: false });

        delete details.responseHeaders['content-security-policy-report-only'];

        // CSP override for userstyles and sponsorblock/dearrow support, and other minor fixes (like allowing data urls since they're used)
        if (details.responseHeaders['content-security-policy']) {
            for (let i = 0; i < details.responseHeaders['content-security-policy'].length; i++) {
                let header = details.responseHeaders['content-security-policy'][i]

                //allow eval (it's used by youtube for bot checks)
                let trustedTypesPattern = /require-trusted-types-for\s+'script'/
                let trustedTypesMatch = header.match(trustedTypesPattern)
                if (trustedTypesMatch) {
                    header = header.replace(/require-trusted-types-for\s+'script';?\s*/g, '')
                }

                // Allow unsafe-inline, data URLs, and external stylesheets for userstyles
                // Remove nonces since unsafe-inline is ignored when nonces are present
                // this has to be done even if userstyles are disabled, since they can be enabled live
                let styleSrcPattern = /style-src\s([^;]*)/
                let styleSrcMatch = header.match(styleSrcPattern)
                if (styleSrcMatch) {
                    let existing = styleSrcMatch[1]
                    // Remove all nonce values and add unsafe-inline, data URLs, and wildcard for @import
                    let withoutNonces = existing.replace(/'nonce-[^']*'/g, '').trim()
                    let updated = `style-src ${withoutNonces} 'unsafe-inline' data: *`
                    header = header.replace(styleSrcPattern, updated)
                }

                // Allow external fonts
                // also has to be done even if userstyles are disabled
                let fontSrcPattern = /font-src\s([^;]*)/
                let fontSrcMatch = header.match(fontSrcPattern)
                if (fontSrcMatch) {
                    let existing = fontSrcMatch[1]
                    let updated = `font-src ${existing} * data:`
                    header = header.replace(fontSrcPattern, updated)
                }

                //sponsorblock and return youtube dislike
                let connectPattern = /connect-src\s([^;]*)/
                let connectMatch = header.match(connectPattern)
                if (connectMatch) {
                    let existing = connectMatch[1]
                    let additions = 'sponsor.ajay.app returnyoutubedislikeapi.com data:'
                    let updated = `connect-src ${existing} ${additions}`
                    header = header.replace(connectPattern, updated)
                }

                //dearrow
                let imgPattern = /img-src\s([^;]*)/
                let imgMatch = header.match(imgPattern)
                if (imgMatch) {
                    let existing = imgMatch[1]
                    let additions = 'dearrow-thumb.ajay.app'
                    let updated = `img-src ${existing} ${additions}`
                    header = header.replace(imgPattern, updated)
                }

                details.responseHeaders['content-security-policy'][i] = header;
            }
        }

        callback({
            responseHeaders: details.responseHeaders
        })
    })

    electron.session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
        let url = new URL(details.url)

        if (url.host === 'www.youtube.com') {
            details.requestHeaders['User-Agent'] = youtubeUserAgent;
        } else {
            details.requestHeaders['User-Agent'] = userAgent;
        }

        callback({
            requestHeaders: details.requestHeaders
        })
    })

    //config management on the web side
    electron.ipcMain.on('get-config', (event) => {
        event.returnValue = config;
    })

    electron.ipcMain.on('set-config', (event, newConfig) => {
        configManager.update(newConfig)
        config = configManager.get()

        if (win) {
            win.webContents.send('config-update', config)
        }

        event.returnValue = config;
    })

    //etc helpers
    electron.ipcMain.handle('is-focused', () => {
        if (win) {
            return win.isFocused();
        } else {
            return false;
        }
    })

    electron.ipcMain.handle('is-steam', () => {
        return runningOnSteam;
    })

    electron.ipcMain.handle('reload', () => {
        if (win) {
            win.webContents.reload()
        }
    })

    electron.ipcMain.handle('set-fullscreen', (e, value) => {
        if (win) {
            win.setFullScreen(value)
        }
    })

    electron.ipcMain.handle('set-on-top', (e, value) => {
        if (win) {
            win.setAlwaysOnTop(value)
        }
    })

    electron.ipcMain.handle('get-deeplink', () => {
        let deeplink = argv._[argv._.length - 1]
        if (deeplink) {
            return deeplink;
        } else {
            return null;
        }
    })

    electron.ipcMain.handle('relaunch-app', () => {
        electron.app.relaunch()
        electron.app.quit()
    })

    //autoplay preview: shows a real youtube.com/embed/ player over a focused tile's thumbnail via a dedicated
    //WebContentsView. this needs its own session (rather than reusing the main window's webContents) because the
    //main session's cookies/UA identify it as a TV/console client, and youtube's embed player refuses to serve
    //those (`embedder.identity.denied`) - a fresh, ordinary-looking session doesn't hit that block, since none of
    //the webRequest handlers above are registered against it.

    //the embed also refuses to play at all when it's not "really" embedded (error 153, checks window.top !==
    //window.self) - a data: url wrapper technically satisfies that, but data: pages have an opaque/null origin and
    //send no referrer, which still isn't what a real embedding website looks like and silently results in a
    //never-playing player. serving the wrapper page from an actual (local) http origin avoids all of that.
    function startPreviewServer() {
        return new Promise((resolve, reject) => {
            previewServer = http.createServer((req, res) => {
                let url = new URL(req.url, 'http://127.0.0.1')
                if (url.pathname !== '/preview') {
                    res.writeHead(404)
                    res.end()
                    return;
                }

                let videoId = url.searchParams.get('v') || ''
                let muted = url.searchParams.get('mute') === '1'

                let ringRadius = url.searchParams.get('ringRadius') || '0px'
                if (!/^[\d.\s%pxem/]+$/i.test(ringRadius)) ringRadius = '0px'; //defensive: only allow plain css <length>/percentage tokens through into the stylesheet below

                let maskColor = url.searchParams.get('maskColor') || '#fff'
                if (!/^[\w.\s#(),%-]+$/.test(maskColor)) maskColor = '#fff'; //defensive allowlist before this gets interpolated into the stylesheet below

                let embedUrl = `https://www.youtube.com/embed/${encodeURIComponent(videoId)}?autoplay=1&controls=0&modestbranding=1&rel=0&playsinline=1&mute=${muted ? 1 : 0}`
                //plain overflow:hidden+border-radius on the wrapper doesn't reliably clip the iframe's video content -
                //chromium can promote a playing <video> to a hardware overlay layer that bypasses normal compositor
                //clipping, and no css clipping technique (border-radius/overflow/clip-path) can reach through that.
                //instead of trying to clip the video (impossible) or drawing a border ring on top of it (visually
                //eats into the video), .mask uses a box-shadow with a huge spread (100vmax): a non-inset box-shadow
                //only ever paints OUTSIDE its element's own (rounded) border-box, so this fills everything outside
                //the rounded rect - i.e. exactly the 4 square corner notches that would otherwise stick out beyond
                //a rounded shape - with the tile's own real border color (maskColor, matching its white focus ring)
                //while leaving the rounded rect's own interior (the video) completely untouched. `.wrap`'s
                //overflow:hidden keeps that huge shadow from bleeding out over the rest of the window (a plain
                //box-shadow paint is not video, so it clips normally, unlike the video itself).
                let wrapperHtml = `<!doctype html><html><head><style>html,body{margin:0;height:100%;background:transparent;overflow:hidden}.wrap{position:relative;width:100%;height:100%;overflow:hidden}iframe{border:0;width:100%;height:100%;display:block}.mask{position:absolute;inset:0;border-radius:${ringRadius};box-shadow:0 0 0 100vmax ${maskColor};pointer-events:none}</style></head><body><div class="wrap"><iframe src="${embedUrl}" allow="autoplay"></iframe><div class="mask"></div></div></body></html>`

                res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
                res.end(wrapperHtml)
            })

            previewServer.on('error', reject)
            previewServer.listen(0, '127.0.0.1', () => {
                previewServerPort = previewServer.address().port;
                resolve();
            })
        })
    }

    //creates the dedicated WebContentsView the first time a preview is actually shown (called only from the
    //'autoplay-preview-show' handler below, which itself bails out early if autoplayPreviewEnabled is false) -
    //so, in total, nothing autoplay-preview-related exists at all (no http server, no extra WebContentsView/
    //session) unless the feature was both enabled AND actually used at least once during this run of the app.
    function getPreviewView() {
        if (previewView) return previewView;

        previewView = new electron.WebContentsView({
            webPreferences: {
                //deliberately in-memory (no 'persist:' prefix) - this session doesn't authenticate as the user
                //and only ever loads our own wrapper page plus youtube's embed player, so there's nothing worth
                //keeping around on disk between runs; it's recreated fresh every time VacuumTube starts anyway.
                session: electron.session.fromPartition('autoplay-preview')
            }
        })

        win.contentView.addChildView(previewView)
        previewView.setBounds({ x: 0, y: 0, width: 0, height: 0 })
        previewView.setBackgroundColor('#00000000') //transparent, so nothing (e.g. a flash of black) shows through before the wrapper page (see startPreviewServer) has painted its own content

        //the embed has no legitimate reason to open new windows/tabs or navigate itself away from our wrapper
        //page/the embed player - deny both outright rather than letting some unexpected click/redirect inside
        //the iframe (e.g. a end-of-video overlay) take over this view
        previewView.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
        previewView.webContents.on('will-navigate', (event) => event.preventDefault())

        return previewView;
    }

    //rounds the (fractional-pixel) target rect to whole device pixels. x/y/width/height are rounded independently
    //(rather than e.g. always rounding outward) since that's simplest and unbiased - any of the alternatives
    //tried here ended up just moving a occasional +/-1px seam against the tile's real edge from one side to
    //another, rather than actually eliminating it, since the real source is the tile's own fractional-pixel
    //layout, not a systematic bias in one particular direction.
    function previewBounds(rect) {
        return {
            x: Math.round(rect.x),
            y: Math.round(rect.y),
            width: Math.max(0, Math.round(rect.width)),
            height: Math.max(0, Math.round(rect.height))
        }
    }

    let previewToken = 0; //bumped on every show/hide, so a late 'media-started-playing' from an abandoned show() can't reveal a stale preview
    let previewLastRect = null; //the target rect passed to the current show(), remembered so it's still available once 'media-started-playing' actually fires and reveals the view

    electron.ipcMain.on('autoplay-preview-show', (event, { videoId, rect, ringRadius, maskColor } = {}) => {
        if (!autoplayPreviewEnabled || previewServerFailed || !win || !videoId || !rect) return;

        let view = getPreviewView()
        let token = ++previewToken;
        previewLastRect = rect;

        view.webContents.removeAllListeners('media-started-playing') //drop any listener left over from a still-loading previous show()
        view.webContents.setAudioMuted(config.autoplay_preview_muted === true)

        view.setBounds({ x: 0, y: 0, width: 0, height: 0 }) //stays hidden until the video actually starts playing, so we never flash youtube's own loading/error state over the thumbnail

        let muted = config.autoplay_preview_muted === true;
        let params = new URLSearchParams({
            v: videoId,
            mute: muted ? '1' : '0',
            ringRadius: ringRadius || '0px',
            maskColor: maskColor || '#fff'
        })
        let wrapperUrl = `http://127.0.0.1:${previewServerPort}/preview?${params.toString()}`

        view.webContents.loadURL(wrapperUrl)

        view.webContents.once('media-started-playing', () => {
            if (token !== previewToken) return; //superseded by a newer show()/hide() while this one was still loading
            if (previewLastRect) view.setBounds(previewBounds(previewLastRect))
        })
    })

    electron.ipcMain.on('autoplay-preview-hide', () => {
        if (!autoplayPreviewEnabled) return;

        previewToken++; //invalidates any still-pending media-started-playing listener from the last show()
        previewLastRect = null;

        if (!previewView) return;

        previewView.webContents.removeAllListeners('media-started-playing')
        previewView.setBounds({ x: 0, y: 0, width: 0, height: 0 })
        previewView.webContents.loadURL('about:blank') //stop playback/decoding rather than just hiding it
    })

    userstyles.setup({ userData, getWindow: () => win })

    await createWindow()

    userstyles.startWatcher()

    electron.app.on('activate', () => {
        if (electron.BrowserWindow.getAllWindows().length === 0) createWindow()
    })
}

async function createWindow() {
    let fullscreen = argv['fullscreen'] || runningOnSteam || config.fullscreen || false;
    let noWindowDecs = argv['no-window-decorations'] || config.no_window_decorations || false;

    win = new electron.BrowserWindow({
        width: 1200,
        height: 675,
        backgroundColor: '#282828',
        fullscreen, //this sometimes doesn't work for people, so it's repeated below
        fullscreenable: true, //explicitly enable fullscreen functionality on macOS
        titleBarStyle: noWindowDecs ? 'hidden' : 'default',
        frame: noWindowDecs ? false : true,
        icon: './assets/icon.png',
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: false,
            sandbox: false, //allows me to use node apis in preload, but doesn't allow youtube to do so (solely need node apis for requiring the modules)
            nodeIntegrationInSubFrames: true, //since nodeIntegration is already false, it doesn't actually enable nodeIntegration in frames, but it does enable the preload script in frames which is needed for some weird edgecases where youtube may place the entirety of leanback in a frame
            preload: path.join(__dirname, 'preload/index.js')
        },
        title: 'VacuumTube'
    })

    // Ensure the *content* area (excluding OS window borders) stays 16:9 on all platforms.
    const [outerW, outerH] = win.getSize()
    const [innerW, innerH] = win.getContentSize()
    const extraWidth = outerW - innerW;
    const extraHeight = outerH - innerH;

    const TARGET_RATIO = 16 / 9;
    const isWindows = process.platform === 'win32'

    if (isWindows) {
        // Custom resize handling for Windows where OS chrome breaks outer-ratio locking.
        // To keep this implementation simple, we'll prevent the user from resizing
        // the window on the wide side. It will automatically adjust the height.
        win.on('will-resize', (event, newBounds) => {
            event.preventDefault()

            const contentW = newBounds.width - extraWidth;
            const adjustedContentH = Math.round(contentW / TARGET_RATIO)

            win.setBounds({
                width: newBounds.width,
                height: adjustedContentH + extraHeight
            })
        })

        win.setBounds({
            width: outerW,
            height: Math.round((outerW - extraWidth) / TARGET_RATIO) + extraHeight
        })
    } else {
        // Built-in electron aspect ratio lock works fine elsewhere.
        win.setAspectRatio(TARGET_RATIO)
    }

    win.setMenuBarVisibility(false)
    win.setAutoHideMenuBar(false)

    win.once('ready-to-show', () => {
        win.setFullScreen(fullscreen)
        win.setAlwaysOnTop(config.keep_on_top)
        win.show()
    })

    if (argv['debug-gpu']) {
        console.log('Loading chrome://gpu')
        win.loadURL('chrome://gpu', { userAgent })
        return;
    }

    if (argv['enable-devtools']) {
        console.log('Launching with developer tools enabled')
        win.webContents.toggleDevTools()
    }

    console.log(`Loading ${youtubeUrl}`)
    win.loadURL(youtubeUrl, { userAgent: youtubeClientUserAgent })

    //remember fullscreen preference
    win.on('enter-full-screen', () => {
        configManager.update({ fullscreen: true })
        config = configManager.get()
        win.webContents.send('config-update', config)
    })

    win.on('leave-full-screen', () => {
        configManager.update({ fullscreen: false })
        config = configManager.get()
        win.webContents.send('config-update', config)
    })

    //for the controller support to know whether or not the window itself is in focus
    win.addListener('focus', () => {
        win.webContents.send('focus')
    })

    win.addListener('blur', () => {
        win.webContents.send('blur')
    })

    //maximizing/unmaximizing resizes the content area without necessarily firing a DOM 'resize' event - forward
    //these explicitly so the renderer can tear down any active autoplay preview (see 'window-bounds-changed' in
    //src/preload/modules/autoplay-preview.js), since its position would otherwise no longer match the tile
    win.on('maximize', () => {
        win.webContents.send('window-bounds-changed')
    })

    win.on('unmaximize', () => {
        win.webContents.send('window-bounds-changed')
    })

    //keep window title as VacuumTube
    win.webContents.on('page-title-updated', () => {
        win.setTitle('VacuumTube')
    })

    win.on('closed', () => {
        previewView = null; //the view itself gets torn down along with the window, just drop our reference to it
    })
}

function portable() {
    try {
        let exeDir;
        if (process.platform === 'linux' && process.env.APPIMAGE) {
            exeDir = path.dirname(process.env.APPIMAGE)
        } else {
            exeDir = path.dirname(electron.app.getPath('exe'))
        }

        let portablePath = null;
        if (fs.existsSync(path.join(exeDir, './portable.txt'))) {
            let str = fs.readFileSync(path.join(exeDir, './portable.txt'), 'utf-8')
            if (str && str.trim().length !== 0) {
                portablePath = str.trim()
            } else {
                portablePath = path.join(exeDir, 'data')
            }
        } else if (argv['portable'] === true || argv['p'] === true) { //arg specified, but not set to any particular path 
            portablePath = path.join(exeDir, 'data')
        } else if (argv['portable']) { //--portable arg specified, set to particular path
            portablePath = argv['portable']
        } else if (argv['p']) { //-p arg specified, set to particular path
            portablePath = argv['p']
        }

        return portablePath;
    } catch (err) {
        console.error('Failed to detect portable mode, assuming non-portable', err)
        return null;
    }
}

main()
