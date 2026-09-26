const dgram = require('dgram')
const http = require('./http')
const net = require('./net')
const constants = require('./constants')

const socket = dgram.createSocket({ type: 'udp4', reuseAddr: true })
const joinedInterfaces = new Set()
const failedInterfaces = new Set()

socket.on('error', (err) => {
    console.error('[h5vcc] DIAL: SSDP socket error', err)
})

function joinGroup() {
    let addresses = net.getInterfaces().map((iface) => iface.address)

    //forget interfaces that went away so they're joined again if they come back
    for (let address of joinedInterfaces) {
        if (!addresses.includes(address)) {
            joinedInterfaces.delete(address)
        }
    }

    for (let address of addresses) {
        if (joinedInterfaces.has(address)) continue;

        try {
            socket.addMembership(constants.address, address)
            joinedInterfaces.add(address)
        } catch (err) {
            if (err.code === 'EADDRINUSE') { //already joined through this interface
                joinedInterfaces.add(address)
                continue;
            }

            if (!failedInterfaces.has(address)) {
                console.warn(`[h5vcc] DIAL: Failed to listen for SSDP on ${address}`, err)
                failedInterfaces.add(address)
            }
        }
    }
}

socket.on('message', async (msg, rinfo) => {
    if (msg.length === 0) return;

    try {
        let ssdp = parseSSDP(msg)
        if (ssdp.method !== 'M-SEARCH' || ssdp.path !== '*') return;

        let address = net.getInterfaceAddressFor(rinfo.address) ?? await net.getDefaultAddress()
        if (!address) return;

        let response = createSSDP({
            status: 200,
            statusText: 'OK',
            headers: {
                'CACHE-CONTROL': 'max-age=1800',
                'DATE': `${new Date().toGMTString()}`,
                'EXT': '',
                'LOCATION': `http://${address}:${http.port}/`,
                'SERVER': `${constants.osAgent} UPnP/1.0 ${constants.appAgent}`,
                'ST': 'urn:dial-multiscreen-org:service:dial:1',
                'USN': `uuid:${constants.uuid()}::urn:dial-multiscreen-org:service:dial:1`
            }
        })

        socket.send(response, rinfo.port, rinfo.address, (err) => {
            if (err) {
                console.error(`[h5vcc] DIAL: Failed to respond to SSDP discovery from ${rinfo.address}`, err)
            }
        })
    } catch (err) {
        console.error('[h5vcc] DIAL: Failed to handle SSDP discovery', err)
    }
})

function start() {
    socket.bind(constants.port, () => {
        joinGroup()
        setInterval(joinGroup, 30000)
    })
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
    start
}