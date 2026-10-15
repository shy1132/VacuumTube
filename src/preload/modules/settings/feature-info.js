// Shared layout for optional feature details; see docs/feature-info-pages.md.
const fs = require('fs')
const path = require('path')
const { shell } = require('electron')
const { el } = require('../../util/functions')

const icons = {
    'audio-lines': 'data:image/svg+xml,' + encodeURIComponent(
        fs.readFileSync(path.join(__dirname, 'icons/audio-lines.svg'), 'utf8')
            .replace('stroke="currentColor"', 'stroke="#d4d4d4"'))
}

module.exports = function featureInfo(details, context, focusable) {
    const p = text => el('p', { textContent: text });
    return [
        el('div', { className: 'vt-rich-hero' }, [
            el('div', { className: 'vt-rich-intro' }, [
                details.label ? el('div', { className: 'vt-rich-eyebrow', textContent: details.label }) : null,
                el('h2', { textContent: details.title }),
                p(details.summary),
                details.contributors?.length ? el('div', { className: 'vt-rich-credit' }, [
                    el('span', { textContent: context.locale.generic.contributed_by + ' ' }),
                    el('strong', { textContent: details.contributors.join(', ') })
                ]) : null
            ]),
            icons[details.icon] ? el('div', { className: 'vt-rich-symbol' }, [
                el('img', { src: icons[details.icon], alt: '' })
            ]) : null
        ]),
        details.sections?.length ? el('div', { className: 'vt-rich-explainer' }, details.sections.map(section =>
            el('section', {}, [el('h3', { textContent: section.title }), p(section.text)])
        )) : null,
        details.note || details.source ? el('div', { className: 'vt-rich-footer' }, [
            details.note ? el('span', { textContent: details.note }) : null,
            details.source && /^https:\/\//.test(details.source.url) ? focusable('contribution', 'vt-rich-source', [
                el('span', { textContent: details.source.label + ' ↗' })
            ], () => shell.openExternal(details.source.url)) : null
        ]) : null
    ];
}
