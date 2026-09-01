const dgram = require('dgram')
const http = require('http')
const constants = require('./constants')

const handlers = []

const server = http.createServer((req, res) => {
    res.setHeader('Server', constants.appAgent)

    for (let [ method, path, handler ] of handlers) {
        if (req.method === method && req.url === path) {
            handler(req, res)
            return;
        }
    }

    res.writeHead(404)
    res.end()
})

function route(method, path, handler) {
    handlers.push([ method, path, handler ])
}

async function refreshAddress() {
    const localIP = await getLocalIP()
    const addr = server.address()
    if (!addr || typeof addr === 'string') throw new Error('DIAL HTTP server is not listening');

    module.exports.host = localIP;
    module.exports.port = addr.port;
    module.exports.base = `http://${localIP}:${addr.port}`
}

async function listen() {
    if (server.listening) {
        await refreshAddress()
        return;
    }

    await new Promise((resolve, reject) => {
        const onError = (err) => {
            server.off('listening', onListening)
            reject(err)
        }

        const onListening = () => {
            server.off('error', onError)
            resolve()
        }

        server.once('error', onError)
        server.once('listening', onListening)
        server.listen(0)
    })

    await refreshAddress()
}

async function getLocalIP() {
    return await new Promise((resolve, reject) => {
        let sock = dgram.createSocket('udp4')

        const finish = (callback, value) => {
            try { sock.close() } catch {}
            callback(value)
        }

        sock.once('error', (err) => finish(reject, err))
        sock.connect(80, '224.0.0.0')
        sock.once('connect', () => finish(resolve, sock.address().address))
    });
}

module.exports = {
    server,
    route,
    listen
}
