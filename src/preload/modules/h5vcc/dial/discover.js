const dgram = require('dgram')
const http = require('./http')
const constants = require('./constants')

let socket = null;

function handleMessage(msg, rinfo) {
    if (msg.length === 0) return;

    try {
        let ssdp = parseSSDP(msg)
        if (ssdp.method !== 'M-SEARCH' || ssdp.path !== '*') return;

        let response = createSSDP({
            status: 200,
            statusText: 'OK',
            headers: {
                'CACHE-CONTROL': 'max-age=1800',
                'DATE': `${new Date().toGMTString()}`,
                'EXT': '',
                'LOCATION': `${http.base}/`,
                'SERVER': `${constants.osAgent} UPnP/1.0 ${constants.appAgent}`,
                'ST': 'urn:dial-multiscreen-org:service:dial:1',
                'USN': `uuid:${constants.uuid()}::urn:dial-multiscreen-org:service:dial:1`
            }
        })

        let replySocket = dgram.createSocket({ type: 'udp4', reuseAddr: true })
        replySocket.connect(rinfo.port, rinfo.address, () => {
            replySocket.send(response, () => replySocket.close())
        })
    } catch (err) {
        console.error('[h5vcc] DIAL: Failed to handle SSDP discovery', err)
    }
}

async function start() {
    if (socket) return;

    await new Promise((resolve, reject) => {
        const nextSocket = dgram.createSocket({ type: 'udp4', reuseAddr: true })

        const onStartupError = (err) => {
            nextSocket.removeAllListeners()
            try { nextSocket.close() } catch {}
            reject(err)
        }

        nextSocket.once('error', onStartupError)
        nextSocket.bind(constants.port, () => {
            try {
                nextSocket.addMembership(constants.address)
            } catch (err) {
                onStartupError(err)
                return;
            }

            nextSocket.off('error', onStartupError)
            nextSocket.on('error', (err) => console.error('[h5vcc] DIAL: SSDP socket error', err))
            nextSocket.on('message', handleMessage)
            socket = nextSocket;
            resolve()
        })
    })
}

async function stop() {
    if (!socket) return;

    const currentSocket = socket;
    socket = null;

    await new Promise((resolve) => {
        currentSocket.once('close', resolve)
        try { currentSocket.dropMembership(constants.address) } catch {}
        try {
            currentSocket.close()
        } catch {
            resolve()
        }
    })
}

async function restart() {
    await stop()
    await start()
}

function parseSSDP(buf) {
    let str = buf.toString('utf-8')
    let lines = str.split(/\r?\n/)

    let head = lines[0]
    let parts = head.split(' ')

    let method = parts[0]
    let path = parts[1]
    let protocol = parts[2]

    let headers = {}

    for (let line of lines.slice(1)) {
        if (!line?.trim()) continue;

        let i = line.indexOf(': ')

        let key = line.substring(0, i)
        let value = line.substring(i + 2)

        headers[key] = value;
    }

    return {
        protocol,
        method,
        path,
        headers
    };
}

function createSSDP(options) {
    let head = `HTTP/1.1 ${options.status} ${options.statusText}`

    let headersText = ''
    for (let [ key, value ] of Object.entries(options.headers || {})) {
        headersText += `${key}: ${value}\r\n`
    }

    return `${head}\r\n${headersText}\r\n`;
}

module.exports = {
    start,
    stop,
    restart
}
