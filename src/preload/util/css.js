const functions = require('../util/functions')

let injectedStyles = {}
let ready = false;
let observer;

async function injectStyle(id, text) {
    await functions.waitForCondition(() => ready)

    const styleId = `vt-${id}`

    const existingStyle = document.getElementById(styleId)
    if (existingStyle) {
        existingStyle.remove()
    }

    const style = document.createElement('style')
    style.id = styleId;
    style.type = 'text/css'
    style.textContent = text;

    injectedStyles[id] = style;

    reinjectStylesheets()
}

function deleteStyle(id) {
    const styleId = `vt-${id}`
    const style = document.getElementById(styleId)

    delete injectedStyles[id];

    if (style) {
        style.remove()
    }
}

function reinjectStylesheets() {
    observer.disconnect() //so we don't pick up our own changes

    for (let style of Object.values(injectedStyles)) {
        document.head.appendChild(style) //if it's already in there, it just gets moved to the bottom
    }

    observer.observe(document.head, { childList: true })
}

async function main() {
    await functions.waitForCondition(() => !!document.head)

    observer = new MutationObserver(() => {
        reinjectStylesheets()
    })

    observer.observe(document.head, { childList: true }) //any time a new element is added to head, reinject everything so that stylesheets are constantly taking priority over ones added by youtube

    ready = true;
}

main()

module.exports = {
    inject: injectStyle,
    delete: deleteStyle
}