const dgram = require('dgram')
const http = require('./http')
const constants = require('./constants')

const socket = dgram.createSocket({ type: 'udp4', reuseAddr: true })

socket.bind(constants.port, () => {
    socket.addMembership(constants.address)
})

socket.on('message', (msg, rinfo) => {
    if (msg.length > 0) {
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

            let sock = dgram.createSocket({ type: 'udp4', reuseAddr: true })
            sock.connect(rinfo.port, rinfo.address, () => {
                sock.send(response, (err) => {
                    sock.close()
                })
            })
        } catch (err) {
            console.error('[h5vcc] DIAL: Failed to handle SSDP discovery', err)
        }
    }
})

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