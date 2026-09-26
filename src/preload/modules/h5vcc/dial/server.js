const http = require('./http')
const constants = require('./constants')
const package = require('../../../../../package.json')

const doc = new DOMParser().parseFromString('<root/>', 'text/xml')

function el(tag, children, attrs) {
    let node = doc.createElement(tag)
    if (attrs) {
        for (let [ key, value ] of Object.entries(attrs)) {
            node.setAttribute(key, value)
        }
    }

    if (typeof children === 'string') {
        node.textContent = children;
    } else if (children) {
        for (let child of children) {
            node.appendChild(child)
        }
    }

    return node;
}

function buildDeviceDesc(base) {
    doc.documentElement.replaceWith(el('root', [
        el('specVersion', [
            el('major', '1'),
            el('minor', '0')
        ]),
        el('URLBase', base),
        el('device', [
            el('deviceType', 'urn:dial-multiscreen-org:device:dial:1'),
            el('friendlyName', `${constants.hostname} (VacuumTube)`),
            el('manufacturer', 'VacuumTube'),
            el('modelName', package.version),
            el('UDN', `uuid:${constants.uuid()}`)
        ])
    ], { xmlns: 'urn:schemas-upnp-org:device-1-0' }))

    return '<?xml version="1.0"?>' + new XMLSerializer().serializeToString(doc);
}

http.route('GET', '/', (req, res) => {
    let base = http.baseFor(req)

    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/xml; charset="utf-8"')
    res.setHeader('Application-URL', `${base}/apps`)

    res.end(buildDeviceDesc(base))
})

async function handle(basePath, callback, req, res) {
    let body = ''
    if (req.method === 'POST' || req.method === 'DELETE') {
        body = await readBody(req)
    }

    let headers = new Headers()
    let data = {
        addHeader: (key, value) => headers.append(key, value)
    }

    let cb = callback({ host: `${req.socket.localAddress}:${req.socket.localPort}`, path: basePath, body }, data)
    if (!cb) {
        res.statusCode = 400;
        res.end()
        return;
    }

    if (data.mimeType) headers.append('Content-Type', data.mimeType)

    res.statusCode = data.responseCode ?? 200;
    res.setHeaders(headers)

    if (data.body) {
        res.end(data.body)
    } else {
        res.end()
    }
}

async function readBody(req, max = 102400) {
    return await new Promise((resolve, reject) => {
        if (!req.headers['content-length'] && req.headers['transfer-encoding'] !== 'chunked') {
            resolve('')
            return;
        }

        let chunks = []
        let size = 0;

        req.on('data', (chunk) => {
            size += chunk.length;

            if (size > max) {
                req.destroy()
                reject(new Error('Body too large'))
                return;
            }

            chunks.push(chunk)
        })

        req.on('end', () => resolve(Buffer.concat(chunks).toString()))
        req.on('error', reject)
    });
}

module.exports = class {
    constructor(appName) {
        this.appName = appName;
        this.basePath = `/apps/${appName}`
    }

    #fullPath(path) {
        return (this.basePath + path).replace(/\/+$/, '') || '/';
    }

    #route(method, path, callback) {
        http.route(method, this.#fullPath(path), (req, res) => {
            handle(this.basePath, callback, req, res).catch((err) => {
                console.error('[h5vcc] DIAL: Failed to handle request', req.method, req.url, err)

                if (!res.headersSent) res.statusCode = 500;
                res.end()
            })
        })
    }

    onGet(path, callback) {
        this.#route('GET', path, callback)
    }

    onPost(path, callback) {
        this.#route('POST', path, callback)
    }

    onDelete(path, callback) {
        this.#route('DELETE', path, callback)
    }
}