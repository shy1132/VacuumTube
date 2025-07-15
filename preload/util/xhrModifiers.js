//overrides xmlhttprequest to be able to modify responses, used for dearrow support (the benefit to this over jsonModifiers is that since you're doing it from the response itself, you can use async stuff)

const functions = require('./functions')

const responseModifiers = []
const OriginalXMLHttpRequest = window.XMLHttpRequest;

let blocked = false;

window.XMLHttpRequest = function () { //i've lost track of what's going on in here at this point, but it works
    const xhr = new OriginalXMLHttpRequest()
    const originalOpen = xhr.open;

    xhr.open = async function (method, url) {
        this._method = method;
        this._url = url;

        if (blocked) {
            await functions.waitForCondition(() => !blocked)
        }

        return originalOpen.apply(this, arguments);
    }

    let readyStateHandler = null;
    let loadHandler = null;

    async function modifyResponse() {
        if (xhr._modifiedAlready || xhr.readyState !== 4) return;
        xhr._modifiedAlready = true;

        let modifiedText = xhr.responseText;

        for (let modifier of responseModifiers) {
            try {
                let modified = await modifier(xhr._url, modifiedText)
                if (modified === undefined) continue;

                modifiedText = modified;
            } catch (err) {
                console.error('an xhr modifier failed', err)
                continue;
            }
        }

        Object.defineProperty(xhr, 'responseText', {
            get() {
                return modifiedText;
            }
        })

        Object.defineProperty(xhr, 'response', {
            get() {
                return modifiedText;
            }
        })
    }

    Object.defineProperty(xhr, 'onreadystatechange', {
        get() {
            return readyStateHandler;
        },
        set(handler) {
            readyStateHandler = async function () {
                if (xhr.readyState === 4) {
                    await modifyResponse()
                }

                handler.apply(xhr, arguments)
            }

            xhr.addEventListener('readystatechange', readyStateHandler)
        }
    })

    Object.defineProperty(xhr, 'onload', {
        get() {
            return loadHandler;
        },
        set(handler) {
            loadHandler = async function () {
                await modifyResponse()
                handler.apply(xhr, arguments)
            }

            xhr.addEventListener('load', loadHandler)
        }
    })

    const originalAddEventListener = xhr.addEventListener;
    xhr.addEventListener = function (type, listener) {
        if (type === 'load') {
            let wrapped = async function () {
                await modifyResponse()
                listener.apply(xhr, arguments)
            }

            return originalAddEventListener.call(this, type, wrapped);
        }

        return originalAddEventListener.apply(this, arguments);
    }

    return xhr;
}

function addResponseModifier(func) {
    responseModifiers.push(func)
}

function block() {
    blocked = true;
}

function unblock() {
    blocked = false;
}

module.exports = {
    addResponseModifier,
    block,
    unblock
}