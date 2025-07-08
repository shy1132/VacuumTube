//trickery to make it always enable high res quality options, by zooming the page out while the player is loading, then back in after it's loaded
/*
todo: better way to do this?
this hack is noticeable because the profile pictures on the "who's watching?" screen will jump a bit when it unzooms after the player loads
could just remove altogether since it's only used because the quality limit isn't dynamic, it's decided by your window size when you first open it, and most people use it in fullscreen anyways. idk tho
*/

const { ipcRenderer } = require('electron')
const functions = require('../util/functions')

module.exports = () => {
    window.addEventListener('load', async () => {
        ipcRenderer.invoke('set-zoom', -10)
        await functions.waitForSelector('.html5-main-video') //player
        ipcRenderer.invoke('set-zoom', 0)
    })
}