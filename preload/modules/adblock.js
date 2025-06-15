//built in adblocker

const jsonMod = require('../util/jsonModifiers')
const configManager = require('../config')
const config = configManager.get()

module.exports = () => {
    if (!config.adblock) return;

    jsonMod.addModifier((json) => {
        //video ads
        if (json.adPlacements) {
            json.adPlacements = []
        }

        if (json.adSlots) {
            json.adSlots = []
        }

        //home feed ads (also removes giant banner ad)
        let homeFeed = json?.contents?.tvBrowseRenderer?.content?.tvSurfaceContentRenderer?.content?.sectionListRenderer;
        if (homeFeed?.contents) {
            homeFeed.contents = homeFeed.contents.filter(r => !r.adSlotRenderer)

            for (let feed of homeFeed.contents) {
                let horizontal = feed?.shelfRenderer?.content?.horizontalListRenderer;
                if (!horizontal?.items) continue;

                horizontal.items = horizontal.items.filter(i => !i.adSlotRenderer)
            }
        }

        //search feed ads
        let searchFeed = json?.contents?.sectionListRenderer;
        if (searchFeed?.contents) {
            for (let feed of searchFeed.contents) {
                let horizontal = feed?.shelfRenderer?.content?.horizontalListRenderer;
                if (!horizontal?.items) continue;

                horizontal.items = horizontal.items.filter(i => !i.adSlotRenderer)
            }
        }

        return json;
    })
}