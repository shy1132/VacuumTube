//built in adblocker
//todo: in future configuration menu, add a way to disable/enable this

module.exports = () => {
    let jsonParse = JSON.parse;

    JSON.parse = (...args) => { //overriding json.parse so that when it parses innertube responses, we can manipulate it to remove the ads
        let json = jsonParse.apply(this, args)

        try {
            //video ads
            if (json.adPlacements) {
                json.adPlacements = []
            }

            if (json.adSlots) {
                json.adSlots = []
            }

            //home feed ads
            let homeFeed = json?.contents?.tvBrowseRenderer?.content?.tvSurfaceContentRenderer?.content?.sectionListRenderer;
            if (homeFeed?.contents) {
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
        } catch (err) {
            console.error('ad blocker JSON.parse override failed', err)
            return json; //just to be safe, return what we have
        }
    }
}