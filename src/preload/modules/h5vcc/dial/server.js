const os = require('os')
const http = require('./http')
const constants = require('./constants')
const package = require('../../../../../package.json')

const doc = new DOMParser().parseFromString('<root/>', 'text/xml')

function el(tag, children, attrs) {
    let node = doc.createElement(tag)
    if (attrs) {
        for (let [key, value] of Object.entries(attrs)) {
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

doc.documentElement.replaceWith(el('root', [
    el('specVersion', [
        el('major', '1'),
        el('minor', '0')
    ]),
    el('URLBase', http.base),
    el('device', [
        el('deviceType', 'urn:dial-multiscreen-org:device:dial:1'),
        el('friendlyName', `VacuumTube on ${constants.hostname}`),
        el('manufacturer', 'VacuumTube'),
        el('modelName', package.version),
        el('UDN', `uuid:${constants.uuid()}`)
    ])
], { xmlns: 'urn:schemas-upnp-org:device-1-0' }))

const deviceDesc = '<?xml version="1.0"?>' + new XMLSerializer().serializeToString(doc)

http.route('GET', '/', (req, res) => {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/xml; charset="utf-8"')
    res.setHeader('Application-URL', `${http.base}/apps`)

    res.end(deviceDesc)
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

    let cb = callback({ host: `${http.host}:${http.port}`, path: basePath, body }, data)
    if (!cb) {
        res.statusCode = 400;
        res.end()
        return;
    }

    if (data.mimeType) headers.append('Content-Type', data.mimeType)

    res.statusCode = data.responseCode;
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

    onGet(path, callback) {
        http.route('GET', this.#fullPath(path), (req, res) => handle(this.basePath, callback, req, res))
    }

    onPost(path, callback) {
        http.route('POST', this.#fullPath(path), (req, res) => handle(this.basePath, callback, req, res))
    }

    onDelete(path, callback) {
        http.route('DELETE', this.#fullPath(path), (req, res) => handle(this.basePath, callback, req, res))
    }
}