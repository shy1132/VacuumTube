//builds the identity VacuumTube presents to youtube
/*
about the user agent:
leanback only lets you in with a user agent from one of the tv/console apps, and it decides a lot based on it (ui quality, thumbnails, player build, etc)
the tv youtube apps run on cobalt (usually), so VacuumTube presents itself as a cobalt build, in exactly the format cobalt generates:
https://github.com/youtube/cobalt/blob/main/cobalt/browser/user_agent/user_agent_platform_info.cc

Mozilla/5.0 (<os>) Cobalt/<version>-<config> (unlike Gecko) <js engine> <rasterizer> Starboard/<api version>, <odm>_<device type>_<chipset>_<model year>/<firmware> (<brand>, <model>) <aux>

the device section is where VacuumTube actually identifies itself. DESKTOP is the device type cobalt's desktop linux build reports
youtube parses it into brand "VacuumTube", model "<os>", browser "Cobalt", platform "DESKTOP"
the aux field is the same slot the android tv app puts its package name and version into, which we put our appId into

cobalt 27 is chromium based (unlike previous versions), which is the closest match to what electron is, and it exposes client hints like chromium does, so those are set to exactly what cobalt reports (brand = device brand, platform = "Starboard")
*/

const package = require('../package.json')

//constants
const appId = package.build.appId;
const googleHosts = [ 'youtube.com', 'googlevideo.com', 'ytimg.com', 'ggpht.com', 'google.com', 'googleapis.com', 'gstatic.com', 'doubleclick.net', 'googleusercontent.com', 'youtube-nocookie.com' ]

//pulled from latest android tv app
const cobaltVersion = '27.lts.3.1040976-gold'
const cobaltMajorVersion = '27'
const v8Version = '13.8.258.54'
const starboardVersion = 18;
const modelYear = new Date().getFullYear() //cobalt's desktop build reports current year

const brand = 'VacuumTube'

//util
function getPlatform() {
    if (process.platform === 'win32') {
        return { os: 'Windows NT 10.0; Win64; x64', model: 'Windows' }; //frozen like chrome's
    } else if (process.platform === 'darwin') {
        return { os: 'Macintosh; Intel Mac OS X 10_15_7', model: 'macOS' }; //frozen like chrome's, even on apple silicon
    } else {
        return { os: `X11; Linux ${process.arch === 'arm64' ? 'aarch64' : 'x86_64'}`, model: 'Linux' };
    }
}

function getChipset() {
    switch (process.arch) {
        case 'x64': return 'x8664'; //cobalt strips everything but alphanumerics
        case 'arm64': return 'arm64';
        case 'ia32': return 'x86';
        default: return process.arch.replace(/[^a-zA-Z0-9]/g, '') || 'Unknown';
    }
}

function brandList(list) {
    return list.map(b => `"${b.brand}";v="${b.version}"`).join(', ');
}

function isGoogleHost(host) {
    return googleHosts.some(h => host === h || host.endsWith('.' + h));
}

//identification
const platform = getPlatform()

const userAgent = `Mozilla/5.0 (${platform.os}) Cobalt/${cobaltVersion} (unlike Gecko) v8/${v8Version}-jit gles Starboard/${starboardVersion}, ${brand}_DESKTOP_${getChipset()}_${modelYear}/${package.version} (${brand}, ${platform.model}) ${appId}/${package.version}`
const genericUserAgent = `VacuumTube/${package.version}` //for anything that isn't youtube/google (sponsorblock, dearrow, return youtube dislike, etc)

//what cobalt reports as its client hints (GetCobaltUserAgentMetadata), in the format of cdp Emulation.setUserAgentOverride
const userAgentMetadata = {
    brands: [ { brand, version: cobaltMajorVersion } ],
    fullVersionList: [ { brand, version: cobaltVersion.split('-')[0].split('.').slice(0, 3).join('.') } ],
    fullVersion: cobaltVersion.split('-')[0].split('.').slice(0, 3).join('.'),
    platform: 'Starboard',
    platformVersion: '',
    architecture: process.arch.startsWith('arm') ? 'arm' : 'x86',
    model: '',
    mobile: false,
    bitness: process.arch === 'ia32' || process.arch === 'arm' ? '32' : '64',
    wow64: false
}

const clientHintHeaders = {
    'sec-ch-ua': brandList(userAgentMetadata.brands),
    'sec-ch-ua-mobile': userAgentMetadata.mobile ? '?1' : '?0',
    'sec-ch-ua-platform': `"${userAgentMetadata.platform}"`,
    'sec-ch-ua-full-version-list': brandList(userAgentMetadata.fullVersionList),
    'sec-ch-ua-full-version': `"${userAgentMetadata.fullVersion}"`,
    'sec-ch-ua-platform-version': `"${userAgentMetadata.platformVersion}"`,
    'sec-ch-ua-arch': `"${userAgentMetadata.architecture}"`,
    'sec-ch-ua-bitness': `"${userAgentMetadata.bitness}"`,
    'sec-ch-ua-model': `"${userAgentMetadata.model}"`,
    'sec-ch-ua-wow64': userAgentMetadata.wow64 ? '?1' : '?0'
}

function applyToRequestHeaders(url, headers) {
    let google = isGoogleHost(url.hostname)

    for (let key of Object.keys(headers)) {
        let lower = key.toLowerCase()
        if (lower === 'user-agent') {
            delete headers[key]
        } else if (lower.startsWith('sec-ch-ua')) {
            delete headers[key]
            if (google && clientHintHeaders[lower] !== undefined) {
                headers[lower] = clientHintHeaders[lower]
            }
        }
    }

    headers['User-Agent'] = google ? userAgent : genericUserAgent;
}

async function applyToWebContents(webContents) {
    try {
        if (!webContents.debugger.isAttached()) webContents.debugger.attach('1.3')
        await webContents.debugger.sendCommand('Emulation.setUserAgentOverride', { userAgent, userAgentMetadata }) //makes navigator.userAgent and navigator.userAgentData match
    } catch (err) {
        console.error('[useragent] Failed to set user agent metadata', err)
    }
}

module.exports = {
    userAgent,
    genericUserAgent,
    userAgentMetadata,
    applyToRequestHeaders,
    applyToWebContents
}