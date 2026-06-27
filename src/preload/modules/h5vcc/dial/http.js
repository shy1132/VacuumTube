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

async function listen() {
    return await new Promise(async (resolve, reject) => {
        const localIP = await getLocalIP()

        server.listen(0, (err) => {
            if (err) {
                reject(`Failed to start server: ${err}`)
                return;
            }

            let addr = server.address()

            module.exports.host = localIP;
            module.exports.port = addr.port;
            module.exports.base = `http://${localIP}:${addr.port}`

            resolve()
        })
    });
}

async function getLocalIP() {
    return new Promise((resolve) => {
        let sock = dgram.createSocket('udp4')
        sock.connect(80, '224.0.0.0')
        sock.on('connect', () => {
            resolve(sock.address().address)
            sock.close()
        })
    });
}

module.exports = {
    server,
    route,
    listen
}