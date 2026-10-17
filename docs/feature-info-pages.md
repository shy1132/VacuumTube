# Feature information pages

Use an information page when a setting needs more explanation than its short row description. It is optional: do not add an info button to every setting.

Music Mode (`src/preload/modules/settings/pages/music-info.js`) is the working example. Pages use the shared `feature-info.js` renderer and existing settings navigation; do not create a separate DOM renderer or stylesheet for each feature.

## Add a page

1. Create a module in `src/preload/modules/settings/pages/` with a unique `id`, a localized `title`, and `details(locale)` returning the fields below.
2. Register it in `pages/index.js`.
3. Add `infoPage: 'your-page-id'` to its toggle row. Leave it absent on settings that need no extra explanation.
4. Add strings under `settings.feature_info` in `locale/en.json`. The existing locale provider supplies English fallback for missing translations.

```js
module.exports = {
    id: 'example-info',
    title: locale => locale.feature_info.example.title,
    details: locale => ({
        ...locale.feature_info.example,
        icon: 'audio-lines',
        contributors: ['@verified-contributor'],
        source: {
            label: locale.feature_info.original_contribution,
            url: 'https://github.com/owner/repo/pull/123'
        }
    })
}
```

`details` requires `title` and `summary`. Optional fields are `label` (short category text), `icon` (registered glyph key), `contributors` (display names), `sections` (array of `{ title, text }`), `note`, and `source` (`{ label, url }`, HTTPS only). Omit unused fields; the renderer collapses them. Text is rendered as text, never HTML. Verify attribution against the original contribution, and use “Contributed by” rather than implying sole authorship.

## Icons and assets

The icon registry lives in `feature-info.js`. The bundled Lucide `audio-lines` SVG, upstream license and source commit are in `settings/icons/`, included in packaged builds through `src/**`. Add only the glyphs needed. Preserve their license and provenance; do not add a CDN or a runtime icon dependency. Icons are decorative because the adjacent heading already identifies the feature. Unknown keys omit the icon.

Screenshot galleries are not part of this API. Add one only when a current screenshot explains something the text cannot. Such an extension should use bundled assets, meaningful alt text, reserved image dimensions and missing-image handling, without widening the production Content Security Policy. Do not reuse obsolete menu screenshots.

## Interaction and review

The info button and switch are separate navigation targets. Return opens details without toggling the setting. Information remains readable if the setting is disabled. Escape/Back returns to the options page and restores focus to the invoking info button. The source button opens the original contribution in the browser.

Keep the shared settings margins unchanged. Check the page at normal and narrow window widths, with long translated text, and with optional metadata omitted. Verify the bundled icon loads, opening details preserves the setting, and Back restores focus. Capture screenshots from the running app. Linux Electron checks do not substitute for native macOS keyboard/controller validation.
