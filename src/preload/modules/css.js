//apply the css patches

const fs = require('fs')
const path = require('path')
const css = require('../util/css')

const cssPath = path.join(__dirname, '../', 'style.css')
const text = fs.readFileSync(cssPath, 'utf-8')

module.exports = () => {
    css.inject('patches', text)
}