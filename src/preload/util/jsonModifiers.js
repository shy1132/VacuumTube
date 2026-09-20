//overriding json.parse so that when it parses innertube responses, we can manipulate it to remove ads and similar purposes

const modifiers = []
const jsonParse = JSON.parse;

JSON.parse = function (...args) {
    let json = jsonParse(...args)

    if (typeof json !== 'object' || json === null) return json;

    try {
        for (let modifier of modifiers) {
            json = modifier(json)
        }
    } catch (err) {
        console.error('a json modifier failed', err)
    }

    return json; //just to be safe, return what we have
}

function addModifier(func) {
    modifiers.push(func)
}

module.exports = {
    addModifier
}