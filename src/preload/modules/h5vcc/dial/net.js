const os = require('os')
const dgram = require('dgram')

function toInt(address) {
    return address.split('.').reduce((acc, part) => (acc << 8) + Number(part), 0) >>> 0;
}

function isLocalAddress(address) { //private, link-local, and loopback ipv4 addresses
    if (!address || !/^\d+\.\d+\.\d+\.\d+$/.test(address)) return false;

    let [ a, b ] = address.split('.').map(Number)
    return a === 10 ||
        a === 127 ||
        (a === 172 && b >= 16 && b <= 31) ||
        (a === 192 && b === 168) ||
        (a === 169 && b === 254);
}

function getInterfaces() {
    return Object.values(os.networkInterfaces()).flat().filter((iface) => iface.family === 'IPv4' && !iface.internal);
}

function getInterfaceAddressFor(remoteAddress) {
    if (!/^\d+\.\d+\.\d+\.\d+$/.test(remoteAddress)) return null;

    let remote = toInt(remoteAddress)
    for (let iface of getInterfaces()) {
        let mask = toInt(iface.netmask)
        if ((toInt(iface.address) & mask) === (remote & mask)) return iface.address;
    }

    return null;
}

function getDefaultAddress() {
    return new Promise((resolve) => {
        let sock = dgram.createSocket('udp4')
        let timeout = setTimeout(() => finish(null), 1000)

        let finish = (address) => {
            clearTimeout(timeout)
            try { sock.close() } catch {}
            resolve(address)
        }

        sock.on('error', () => finish(null))
        sock.connect(80, '224.0.0.0', (err) => {
            finish(err ? null : sock.address().address)
        })
    });
}

module.exports = {
    isLocalAddress,
    getInterfaces,
    getInterfaceAddressFor,
    getDefaultAddress
}