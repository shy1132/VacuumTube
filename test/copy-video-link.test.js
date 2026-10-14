const assert = require('node:assert/strict');
const test = require('node:test');
const { createCopyVideoHandler } = require('../src/preload/util/copy-video-link');

const id = 'dQw4w9WgXcQ';
function harness(options = {}) {
    const copied = [];
    let notices = 0;
    const document = {
        activeElement: { matches: () => false },
        getSelection: () => '',
        querySelector: () => null,
        ...options.document
    };
    const video = { baseURI: `https://www.youtube.com/watch?v=${id}&list=example`, currentTime: 83.9, duration: 300, ...options.video };
    const handler = createCopyVideoHandler({
        platform: options.platform || 'darwin', document,
        getVideo: () => options.noVideo ? undefined : video,
        getShortId: () => options.shortId || id,
        writeText: options.writeText || ((url) => copied.push(url)),
        onCopied: () => notices++
    });
    function press(extra = {}) {
        const event = { key: 'c', metaKey: true, preventDefault() { this.prevented = true; },
            stopImmediatePropagation() { this.stopped = true; }, ...extra };
        handler(event);
        return event;
    }
    return { copied, press, notices: () => notices };
}

test('Command-C copies a clean video link and consumes the shortcut', () => {
    const h = harness();
    const e = h.press();
    assert.deepEqual(h.copied, [`https://youtu.be/${id}`]);
    assert.equal(e.prevented, true);
    assert.equal(e.stopped, true);
    assert.equal(h.notices(), 1);
});
test('Command-Shift-C floors playback time, including zero', () => {
    for (const [currentTime, second] of [[83.9, 83], [0, 0], [3601.5, 3601]]) {
        const h = harness({ video: { currentTime, duration: 7200 } });
        h.press({ key: 'C', shiftKey: true });
        assert.deepEqual(h.copied, [`https://youtu.be/${id}?t=${second}`]);
    }
});
test('normal Command-C preserves selected text and editable controls', () => {
    for (const document of [
        { getSelection: () => 'selected text' },
        { activeElement: { matches: () => true } },
        { activeElement: { matches: () => false, isContentEditable: true } }
    ]) {
        const h = harness({ document });
        assert.equal(h.press().prevented, undefined);
        assert.deepEqual(h.copied, []);
        h.press({ shiftKey: true });
        assert.equal(h.copied.length, 1);
    }
});
test('legacy Ctrl-Shift-C works on every platform without adding a timestamp', () => {
    for (const platform of ['darwin', 'linux', 'win32']) {
        const h = harness({ platform });
        h.press({ metaKey: false, ctrlKey: true, shiftKey: true });
        assert.deepEqual(h.copied, [`https://youtu.be/${id}`]);
    }
});
test('unrelated shortcuts, modifiers and held keys do not write the clipboard', () => {
    for (const extra of [{ metaKey: false }, { altKey: true }, { ctrlKey: true },
        { key: 'x' }, { metaKey: false, ctrlKey: true }, { repeat: true }]) {
        const h = harness();
        h.press(extra);
        assert.deepEqual(h.copied, []);
        assert.equal(h.notices(), 0);
    }
    const h = harness({ platform: 'linux' });
    h.press();
    assert.deepEqual(h.copied, []);
});
test('missing, malformed and non-watch videos leave clipboard and event untouched', () => {
    for (const options of [{ noVideo: true }, ...[
        'invalid', 'https://www.youtube.com/tv', 'https://www.youtube.com/watch?v=short',
        'https://example.com/watch?v=dQw4w9WgXcQ'
    ].map(baseURI => ({ video: { baseURI } }))]) {
        const h = harness(options);
        assert.equal(h.press().prevented, undefined);
        assert.deepEqual(h.copied, []);
    }
});
test('Shorts use their own ID and omit timestamps', () => {
    const h = harness({ noVideo: true, document: {
        querySelector: () => ({ classList: { contains: () => true } })
    } });
    h.press({ shiftKey: true });
    assert.deepEqual(h.copied, [`https://youtube.com/shorts/${id}`]);
});
test('live, unknown and invalid playback times fall back to plain links', () => {
    for (const video of [{ duration: Infinity }, { duration: NaN }, { duration: 0 },
        { currentTime: NaN }, { currentTime: -1 }, { currentTime: Infinity }]) {
        const h = harness({ video });
        h.press({ shiftKey: true });
        assert.deepEqual(h.copied, [`https://youtu.be/${id}`]);
    }
});
test('failed clipboard writes do not announce success', (t) => {
    t.mock.method(console, 'error', () => {});
    const h = harness({ writeText: () => { throw new Error('clipboard unavailable'); } });
    h.press();
    assert.equal(h.notices(), 0);
    assert.equal(console.error.mock.callCount(), 1);
});
