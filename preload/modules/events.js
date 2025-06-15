//events for main process to use

const { ipcRenderer } = require('electron')

module.exports = () => {
    window.addEventListener('load', () => {
        async function waitForSelector(selector) {
            return new Promise((resolve) => {
                let observer = new MutationObserver(() => {
                    let el = document.querySelector(selector)
                    if (el) {
                        resolve(el)
                        observer.disconnect()
                    }
                })

                observer.observe(document.documentElement, {
                    childList: true,
                    subtree: true
                })

                let el = document.querySelector(selector)
                if (el) {
                    resolve(el)
                    observer.disconnect()
                }
            })
        }

        (async () => {
            ipcRenderer.send('player-started-loading')
            await waitForSelector('.html5-main-video')
            ipcRenderer.send('player-finished-loading')
        })()
    })
}