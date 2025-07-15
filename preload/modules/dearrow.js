//dearrow support (https://dearrow.ajay.app/)

const xhrModifiers = require('../util/xhrModifiers')
const configManager = require('../config')
const config = configManager.get()

const cache = {}

async function getBranding(id) {
    if (id in cache) {
        return cache[id];
    }

    let res = await fetch(`https://sponsor.ajay.app/api/branding?videoID=${id}`)
    if (res.status === 404) return null;

    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);

    let data = await res.json()

    cache[id] = data;
    return data;
}

function getThumbnail(id) {
    return `https://dearrow-thumb.ajay.app/api/v1/getThumbnail?videoID=${id}`;
}

module.exports = () => {
    if (!config.dearrow) return;

    xhrModifiers.addResponseModifier(async (url, text) => {
        if (
            !url.startsWith('/youtubei/v1/browse') &&
            !url.startsWith('/youtubei/v1/search') &&
            !url.startsWith('/youtubei/v1/next')
        ) {
            return;
        }

        let json = JSON.parse(text)

        let items = []
        if (json.continuationContents?.horizontalListContinuation || json.continuationContents?.gridContinuation) { //simple continuations, consistent across requests
            if (json.continuationContents.horizontalListContinuation?.items) { //horizontal
                items = json.continuationContents.horizontalListContinuation.items;
            } else if (json.continuationContents.gridContinuation?.items) { //grid
                items = json.continuationContents.gridContinuation.items;
            }

            if (!items) return;
        } else {
            let contents = []

            if (url.startsWith('/youtubei/v1/browse')) { //feeds (home, subscription, etc, basically anything on the left bar) (i'm sorry for this code, but i tried my best to document it... i really hope it never breaks)
                if (json.contents?.tvBrowseRenderer?.content?.tvSecondaryNavRenderer?.sections) { //sectioned, i wrote this for subscriptions but i don't really know where else it applies
                    let tvSecondaryNavRenderer = json.contents.tvBrowseRenderer.content.tvSecondaryNavRenderer;
                    for (let section of tvSecondaryNavRenderer.sections) {
                        if (!section.tvSecondaryNavSectionRenderer?.tabs) continue;

                        let tab = section.tvSecondaryNavSectionRenderer.tabs[0] //the first tab is the one selected by default, the others have nothing and when they're selected, its a continuation
                        contents = tab.tabRenderer?.content?.tvSurfaceContentRenderer?.content?.sectionListRenderer?.contents;
                    }
                } else if (json.contents?.tvBrowseRenderer?.content?.tvSurfaceContentRenderer?.content?.sectionListRenderer?.contents) { //default horizontal feeds
                    contents = json.contents.tvBrowseRenderer.content.tvSurfaceContentRenderer.content.sectionListRenderer.contents;
                } else if (json.contents?.tvBrowseRenderer?.content?.tvSurfaceContentRenderer?.content?.gridRenderer) { //grid feeds
                    contents = [ json.contents.tvBrowseRenderer.content.tvSurfaceContentRenderer.content ]
                } else if (json.continuationContents?.tvSurfaceContentContinuation?.content?.sectionListRenderer?.contents) { //continuation (except it doesn't fit the format of the other continuations up there)
                    contents = json.continuationContents.tvSurfaceContentContinuation.content.sectionListRenderer.contents;
                }
            } else if (url.startsWith('/youtubei/v1/search')) { //search results
                contents = json.contents?.sectionListRenderer?.contents;
            } else if (url.startsWith('/youtubei/v1/next')) { //recommended videos that appear under video you're watching
                contents = json.contents?.singleColumnWatchNextResults?.pivot?.sectionListRenderer?.contents;
            }

            if (!contents) return;

            for (let content of contents) {
                let someItems;
                if (content.shelfRenderer) { //regular horizontal feed
                    someItems = content.shelfRenderer.content.horizontalListRenderer?.items;
                } else if (content.gridRenderer) { //grid feed
                    someItems = content.gridRenderer.items;
                }

                if (!someItems) continue;

                items = [ ...items, ...someItems ]
            }
        }

        let promises = []

        for (let item of items) {
            if (!item.tileRenderer) continue;
            if (item.tileRenderer.contentType !== 'TILE_CONTENT_TYPE_VIDEO') continue; //this intentionally also blocks out shorts, i don't think dearrow does shorts

            let id = item.tileRenderer.contentId;
            promises.push((async () => {
                try {
                    if (!item.tileRenderer.metadata) return;

                    let branding = await getBranding(id)
                    if (!branding) return;

                    let duration = branding.videoDuration;
                    if (!duration) return;

                    let goodTitle = branding.titles.find(t => t.locked || t.votes >= 0)
                    if (goodTitle) {
                        let words = goodTitle.title.split(' ')
                        words = words.map(w => { //strip autoformatting characters (see https://wiki.sponsor.ajay.app/w/API_Docs/DeArrow)
                            if (w.startsWith('>')) {
                                w = w.slice(1)
                            }

                            return w;
                        })

                        let title = words.join(' ')
                        item.tileRenderer.metadata.tileMetadataRenderer.title.simpleText = title;
                    }

                    let newThumbnail = getThumbnail(id)
                    item.tileRenderer.header.tileHeaderRenderer.thumbnail.thumbnails[0].url = newThumbnail;
                } catch (err) {
                    console.error('getting and applying dearrow branding failed', err)
                }
            })())
        }

        if (promises.length > 0) {
            await Promise.all(promises)
        }

        return JSON.stringify(json);
    })
}