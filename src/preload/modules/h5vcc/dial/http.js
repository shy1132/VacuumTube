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

const PORT_STORAGE_KEY = 'vt-dial-port'

function listen(port = Number(localStorage.getItem(PORT_STORAGE_KEY)) || 0) {
    return new Promise((resolve, reject) => {
        const onError = (err) => {
            if (port && err.code === 'EADDRINUSE') {
                console.warn(`[h5vcc] DIAL: Port ${port} in use, falling back to a random port`)
                resolve(listen(0))
            } else {
                reject(err)
            }
        }
        server.once('error', onError)

        server.listen(port, '0.0.0.0', () => { //ipv4 only
            server.off('error', onError)
            module.exports.port = server.address().port;
            localStorage.setItem(PORT_STORAGE_KEY, String(module.exports.port))
            resolve()
        })
    });
}

//free the port for the next page
window.addEventListener('pagehide', () => server.close())

module.exports = {
    server,
    route,
    listen,
    baseFor,
    port: null
}