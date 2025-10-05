//readds dislikes to youtube using returnyoutubedislike

const xhrModifiers = require('../util/xhrModifiers')
const localeProvider = require('../util/localeProvider')
const configManager = require('../config')
const config = configManager.get()

async function fetchDislikes(videoId) {
    let res = await fetch(`https://returnyoutubedislikeapi.com/Votes?videoId=${videoId}`)
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);

    let data = await res.json()
    return data;
}

module.exports = async () => {
    await localeProvider.waitUntilAvailable()

    let locale = localeProvider.getLocale()

    xhrModifiers.addResponseModifier(async (url, text) => {
        if (!config.dislikes) return;

        if (
            !url.startsWith('/youtubei/v1/next')
        ) {
            return;
        }

        let json = JSON.parse(text)

        let videoId = json.currentVideoEndpoint.watchEndpoint.videoId;

        let panel = json.engagementPanels.find(p => p.engagementPanelSectionListRenderer?.panelIdentifier === 'video-description-ep-identifier')
        if (!panel) return; //shouldn't happen

        let votes;
        try {
            votes = await fetchDislikes(videoId)
        } catch (err) {
            console.error(`fetching dislikes of ${videoId} failed`, err)
            return;
        }

        let dislikes = votes.dislikes;
        let abbreviatedDislikes = Intl.NumberFormat(undefined, {
            notation: 'compact',
            maximumFractionDigits: 1
        }).format(dislikes)

        panel.engagementPanelSectionListRenderer.content.structuredDescriptionContentRenderer.items[0].videoDescriptionHeaderRenderer.factoid.push({
            factoidRenderer: {
                value: {
                    simpleText: abbreviatedDislikes
                },
                label: {
                    simpleText: locale.general.dislikes
                }
            }
        })

        return JSON.stringify(json);
    })
}