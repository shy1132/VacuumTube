//overrides xmlhttprequest to be able to modify responses (the benefit to this over jsonModifiers is that since you're doing it from the response itself, you can use async stuff, and be more explicit)

const functions = require('./functions')

const responseModifiers = []
const requestModifiers = []
const OriginalXMLHttpRequest = window.XMLHttpRequest;
const nativeResponseText = Object.getOwnPropertyDescriptor(OriginalXMLHttpRequest.prototype, 'responseText').get;
const nativeResponse = Object.getOwnPropertyDescriptor(OriginalXMLHttpRequest.prototype, 'response').get;

const responseEvents = [ 'readystatechange', 'load', 'loadend' ]

let blocked = false;

function XMLHttpRequest() {
    const xhr = new OriginalXMLHttpRequest()
    const originalOpen = xhr.open;
    const originalSend = xhr.send;
    const originalAddEventListener = xhr.addEventListener;
    const originalRemoveEventListener = xhr.removeEventListener;

    //per request, reset when the object is reused with open()
    let url = null;
    let modification = null; //promise of the response being modified
    let modifiedText = null;
    let request = 0; //increases with every open() so a modification still running from the previous request can't affect the next one

    function modifyResponse() {
        if (!modification) {
            let current = request;
            modification = (async () => {
                if (xhr.responseType !== '' && xhr.responseType !== 'text') return;
                if (xhr.status === 0) return; //aborted or failed, nothing to modify

                let text = nativeResponseText.call(xhr)

                for (let modifier of responseModifiers) {
                    try {
                        let modified = await modifier(url, text)
                        if (modified === undefined) continue;

                        text = modified;
                    } catch (err) {
                        console.error('an xhr response modifier failed', err)
                    }
                }

                if (current === request) modifiedText = text;
            })()
        }

        return modification;
    }

    function createWrapper(listener) {
        return async function (event) {
            if (xhr.readyState === 4) {
                let current = request;
                await modifyResponse()
                if (current !== request) return; //reopened while waiting, this event belonged to the previous request
            }

            if (typeof listener === 'function') {
                listener.call(xhr, event)
            } else {
                listener.handleEvent(event)
            }
        };
    }

    const wrappers = Object.fromEntries(responseEvents.map((type) => [ type, new WeakMap() ]))
    function wrap(type, listener) {
        if (!wrappers[type].has(listener)) wrappers[type].set(listener, createWrapper(listener))
        return wrappers[type].get(listener);
    }

    xhr.addEventListener = function (type, listener, options) {
        if (responseEvents.includes(type) && listener) {
            return originalAddEventListener.call(this, type, wrap(type, listener), options);
        }

        return originalAddEventListener.apply(this, arguments);
    }

    xhr.removeEventListener = function (type, listener, options) {
        if (responseEvents.includes(type) && listener) {
            return originalRemoveEventListener.call(this, type, wrappers[type].get(listener) ?? listener, options);
        }

        return originalRemoveEventListener.apply(this, arguments);
    }

    for (let type of responseEvents) {
        let handler = null;
        let wrapper = null;

        Object.defineProperty(xhr, `on${type}`, {
            configurable: true,
            get() {
                return handler;
            },
            set(value) {
                if (wrapper) originalRemoveEventListener.call(xhr, type, wrapper)

                handler = typeof value === 'function' ? value : null;
                wrapper = handler ? createWrapper(handler) : null;

                if (wrapper) originalAddEventListener.call(xhr, type, wrapper)
            }
        })
    }

    for (let [ property, nativeGetter ] of [ [ 'responseText', nativeResponseText ], [ 'response', nativeResponse ] ]) {
        Object.defineProperty(xhr, property, {
            configurable: true,
            get() {
                return modifiedText ?? nativeGetter.call(xhr);
            }
        })
    }

    xhr.open = function (method, requestUrl) {
        url = String(requestUrl)
        modification = null;
        modifiedText = null;
        request++;

        return originalOpen.apply(this, arguments);
    }

    xhr.send = function (body) {
        if (!blocked && requestModifiers.length === 0) return originalSend.call(this, body);

        (async () => {
            if (blocked) {
                await functions.waitForCondition(() => !blocked)
            }

            for (let modifier of requestModifiers) {
                try {
                    body = await modifier(url, body)
                } catch (err) {
                    console.error('an xhr request modifier failed', err)
                }
            }

            originalSend.call(xhr, body)
        })().catch((err) => {
            console.error('failed to send modified xhr request', err)
        })
    }

    return xhr;
}

XMLHttpRequest.prototype = OriginalXMLHttpRequest.prototype;
for (let key of [ 'UNSENT', 'OPENED', 'HEADERS_RECEIVED', 'LOADING', 'DONE' ]) {
    XMLHttpRequest[key] = OriginalXMLHttpRequest[key]
}

window.XMLHttpRequest = XMLHttpRequest;

function addResponseModifier(func) {
    responseModifiers.push(func)
}

function addRequestModifier(func) {
    requestModifiers.push(func)
}

function block() {
    blocked = true;
}

function unblock() {
    blocked = false;
}

module.exports = {
    addResponseModifier,
    addRequestModifier,
    block,
    unblock
}