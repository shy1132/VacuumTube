const fs = require('fs')
const path = require('path')
const functions = require('./functions')

const localeFolder = path.join(__dirname, '../', '../', 'locale')

let locale;

functions.waitForCondition(() => !!window.ytcfg)
.then(async () => {
    const lang = window.ytcfg.data_.HL;
    const broadLang = lang.split('-')[0]

    const localeFiles = await fs.promises.readdir(localeFolder)

    const baseLocaleStr = await fs.promises.readFile(path.join(localeFolder, 'en.json'), 'utf-8')
    const baseLocale = JSON.parse(baseLocaleStr)

    let langFile = `${lang}.json`
    if (!localeFiles.includes(langFile)) langFile = `${broadLang}.json`
    if (!localeFiles.includes(langFile)) langFile = 'en.json'

    const str = await fs.promises.readFile(path.join(localeFolder, langFile), 'utf-8')
    const partialLocale = JSON.parse(str)

    locale = functions.deepMerge(baseLocale, partialLocale)
})

async function waitUntilAvailable() {
    await functions.waitForCondition(() => !!locale)
}

function getLocale() {
    return locale;
}

module.exports = {
    waitUntilAvailable,
    getLocale
}