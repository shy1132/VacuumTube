//Clipboard is main-process-only in current Electron versions.
function setup({ ipcMain, clipboard }, getWindow) {
    ipcMain.handle('copy-video-link', (event, url) => {
        if (event.sender !== getWindow()?.webContents ||
            !event.senderFrame?.url?.startsWith('https://www.youtube.com/') ||
            typeof url !== 'string' ||
            !/^https:\/\/(?:youtu\.be\/[\w-]{11}(?:\?t=\d+)?|youtube\.com\/shorts\/[\w-]{11})$/.test(url)) {
            throw new Error('Invalid video link clipboard request');
        }
        return clipboard.writeText(url);
    });
}

module.exports = { setup };
