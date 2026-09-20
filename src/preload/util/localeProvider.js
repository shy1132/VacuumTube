const fs = require('fs')
const path = require('path')
const functions = require('./functions')

const localeFolder = path.join(__dirname, '../', '../', '../', 'locale')

let locale;
let translation = { language: 'en', name: 'English', missing: 0, complete: true }

//counts the strings in the base locale that the language file doesn't have
function countMissing(base, partial) {
    let missing = 0;

    for (const [ key, value ] of Object.entries(base)) {
        const translated = partial?.[key]

        if (value && typeof value === 'object') {
            missing += countMissing(value, translated || {})
        } else if (translated === undefined) {
            missing++;
        }
    }

    return missing;
}

function languageName(code) {
    try {
        return new Intl.DisplayNames([ code ], { type: 'language' }).of(code) || code;
    } catch {
        return code;
    }
}

functions.waitForCondition(() => !!window.ytcfg)
.then(async () => {
    const lang = window.ytcfg.data_.HL;
    const broadLang = lang.split('-')[0]

    const localeFiles = await fs.promises.readdir(localeFolder)

    const baseLocaleStr = await fs.promises.readFile(path.join(localeFolder, 'en.json'), 'utf-8')
    const baseLocale = JSON.parse(baseLocaleStr)

    let langFile = null;
    if (localeFiles.includes(`${lang}.json`)) {
        langFile = `${lang}.json`
    } else if (localeFiles.includes(`${broadLang}.json`)) {
        langFile = `${broadLang}.json`
    }

    const str = await fs.promises.readFile(path.join(localeFolder, langFile || 'en.json'), 'utf-8')
    const partialLocale = JSON.parse(str)

    const language = langFile ? langFile.replace('.json', '') : broadLang;
    const missing = broadLang === 'en' ? 0 : countMissing(baseLocale, langFile ? partialLocale : {})

    translation = {
        language,
        name: languageName(language),
        missing,
        complete: missing === 0
    }

    locale = functions.deepMerge(baseLocale, partialLocale)
})

async function waitUntilAvailable() {
    await functions.waitForCondition(() => !!locale)
}

function getLocale() {
    return locale;
}

function getTranslation() {
    return translation;
}

module.exports = {
    waitUntilAvailable,
    getLocale,
    getTranslation
}