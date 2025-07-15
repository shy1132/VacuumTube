//built in adblocker

const jsonMod = require('../util/jsonModifiers')
const xhrModifiers = require('../util/xhrModifiers')
const configManager = require('../config')
const config = configManager.get()

module.exports = () => {
    if (!config.adblock) return;

    xhrModifiers.addResponseModifier((url, text) => {
        if (
            !url.startsWith('/youtubei/v1/browse') &&
            !url.startsWith('/youtubei/v1/search')
        ) {
            return;
        }

        let json = JSON.parse(text)

        if (url.startsWith('/youtubei/v1/browse')) { //home feed ads (and giant banner ad that sometimes appears) (thank god ads only appear in home feed, go look at dearrow.js)
            let homeFeed = json.contents?.tvBrowseRenderer?.content?.tvSurfaceContentRenderer?.content?.sectionListRenderer;
            if (!homeFeed || !homeFeed.contents) return;

            homeFeed.contents = homeFeed.contents.filter(r => !r.adSlotRenderer)

            for (let feed of homeFeed.contents) {
                let horizontal = feed?.shelfRenderer?.content?.horizontalListRenderer;
                if (!horizontal?.items) continue;

                horizontal.items = horizontal.items.filter(i => !i.adSlotRenderer)
            }
        } else if (url.startsWith('/youtubei/v1/search')) { //search feed ads
            let searchFeed = json.contents?.sectionListRenderer;
            if (!searchFeed || !searchFeed.contents) return;

            for (let feed of searchFeed.contents) {
                let horizontal = feed?.shelfRenderer?.content?.horizontalListRenderer;
                if (!horizontal?.items) continue;

                horizontal.items = horizontal.items.filter(i => !i.adSlotRenderer)
            }
        }

        return JSON.stringify(json);
    })

    //video ads (i don't know where these appear in requests)
    jsonMod.addModifier((json) => {
        if (json.adPlacements) {
            json.adPlacements = []
        }

        if (json.adSlots) {
            json.adSlots = []
        }

        return json;
    })
}