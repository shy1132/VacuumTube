const http = require('http')
const net = require('./net')
const constants = require('./constants')

const handlers = []

const server = http.createServer((req, res) => {
    if (!net.isLocalAddress(req.socket.remoteAddress) || req.headers.host !== `${req.socket.localAddress}:${req.socket.localPort}`) {
        res.writeHead(403)
        res.end()
        return;
    }

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

server.on('error', (err) => {
    console.error('[h5vcc] DIAL: HTTP server error', err)
})

function route(method, path, handler) {
    handlers.push([ method, path, handler ])
}

function baseFor(req) {
    return `http://${req.socket.localAddress}:${req.socket.localPort}`;
}

function listen() {
    return new Promise((resolve, reject) => {
        server.once('error', reject)

        server.listen(0, '0.0.0.0', () => { //ipv4 only
            server.off('error', reject)
            module.exports.port = server.address().port;
            resolve()
        })
    });
}

module.exports = {
    server,
    route,
    listen,
    baseFor,
    port: null
}