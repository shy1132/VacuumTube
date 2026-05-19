//hide shorts from homepage

const xhrModifiers = require('../util/xhrModifiers')
const configManager = require('../config')
const config = configManager.get()

module.exports = () => {
    xhrModifiers.addResponseModifier(async (url, text) => {
        if (!config.hide_shorts) return;

        if (
            !url.startsWith('/youtubei/v1/browse')
        ) {
            return;
        }

        let json = JSON.parse(text)

        let sectionList = json.continuationContents?.sectionListContinuation || json.contents?.tvBrowseRenderer?.content?.tvSurfaceContentRenderer?.content?.sectionListRenderer;
        if (!sectionList) return;

        sectionList.contents = sectionList.contents.filter(i => i?.shelfRenderer?.headerRenderer?.shelfHeaderRenderer?.avatarLockup?.avatarLockupRenderer?.title?.runs?.[0]?.text !== 'Shorts')

        return JSON.stringify(json);
    })
}