const assert = require('node:assert/strict');
const test = require('node:test');
const { setup } = require('../src/video-link-clipboard');
const { createCopyVideoHandler } = require('../src/preload/util/copy-video-link');

const id = 'dQw4w9WgXcQ';
function harness(options = {}) {
    const copied = [];
    let notices = 0;
    let selections = 0;
    const document = {
        activeElement: { matches: () => false },
        getSelection: () => '',
        ...options.document,
        querySelector: selector => selector === '.html5-video-player video'
            ? (options.noVideo ? null : video)
            : options.document?.querySelector?.(selector) ?? null
    };
    const video = { baseURI: `https://www.youtube.com/tv?env_enableMediaStreams=true#/watch?v=${id}&list=example`, currentTime: 83.9, duration: 300, ...options.video };
    const handler = createCopyVideoHandler({
        platform: options.platform || 'darwin', document,
        getShortId: () => options.shortId || id,
        writeText: options.writeText || ((url) => copied.push(url)),
        copySelection: () => selections++,
        onCopied: () => notices++
    });
    async function press(extra = {}) {
        const event = { key: 'c', metaKey: true, preventDefault() { this.prevented = true; },
            stopImmediatePropagation() { this.stopped = true; }, ...extra };
        await handler(event);
        return event;
    }
    return { copied, press, notices: () => notices, selections: () => selections };
}

function clipboardHarness(writeText, webContents = {}) {
    const handlers = new Map();
    setup({ ipcMain: { handle: (name, callback) => handlers.set(name, callback) },
        clipboard: { writeText } }, () => ({ webContents }));
    return { handlers, event: { sender: webContents, senderFrame: { url: 'https://www.youtube.com/tv' } } };
}

test('Command-C copies a clean video link and consumes the shortcut', async () => {
    const h = harness();
    const e = await h.press();
    assert.deepEqual(h.copied, [`https://youtu.be/${id}`]);
    assert.equal(e.prevented, true);
    assert.equal(e.stopped, true);
    assert.equal(h.notices(), 1);
});
test('Command-Shift-C floors playback time, including zero', async () => {
    for (const [currentTime, second] of [[83.9, 83], [0, 0], [3601.5, 3601]]) {
        const h = harness({ video: { currentTime, duration: 7200 } });
        await h.press({ key: 'C', shiftKey: true });
        assert.deepEqual(h.copied, [`https://youtu.be/${id}?t=${second}`]);
    }
});
test('normal Command-C preserves selected text and editable controls', async () => {
    for (const document of [
        { getSelection: () => 'selected text' },
        { activeElement: { matches: () => true } },
        { activeElement: { matches: () => false, isContentEditable: true } },
        { activeElement: { shadowRoot: { activeElement: { matches: () => true } } } }
    ]) {
        const h = harness({ document });
        assert.equal((await h.press()).prevented, true);
        assert.equal(h.selections(), 1);
        assert.equal(h.notices(), 0);
        assert.deepEqual(h.copied, []);
        await h.press({ shiftKey: true });
        assert.equal(h.copied.length, 1);
    }
});
test('legacy Ctrl-Shift-C works on every platform without adding a timestamp', async () => {
    for (const platform of ['darwin', 'linux', 'win32']) {
        const h = harness({ platform });
        await h.press({ metaKey: false, ctrlKey: true, shiftKey: true });
        assert.deepEqual(h.copied, [`https://youtu.be/${id}`]);
    }
});
test('unrelated shortcuts, modifiers and held keys do not write the clipboard', async () => {
    for (const extra of [{ metaKey: false }, { altKey: true }, { ctrlKey: true },
        { key: 'x' }, { metaKey: false, ctrlKey: true }, { repeat: true }]) {
        const h = harness();
        await h.press(extra);
        assert.deepEqual(h.copied, []);
        assert.equal(h.notices(), 0);
    }
    const h = harness({ platform: 'linux' });
    await h.press();
    assert.deepEqual(h.copied, []);
});
test('missing, malformed and non-watch videos leave clipboard and event untouched', async () => {
    for (const options of [{ noVideo: true }, ...[
        'invalid', 'https://www.youtube.com/tv', 'https://www.youtube.com/watch?v=short',
        'https://example.com/watch?v=dQw4w9WgXcQ'
    ].map(baseURI => ({ video: { baseURI } }))]) {
        const h = harness(options);
        assert.equal((await h.press()).prevented, undefined);
        assert.deepEqual(h.copied, []);
    }
});
test('Shorts use their own ID and omit timestamps', async () => {
    const h = harness({ noVideo: true, document: {
        querySelector: () => ({ classList: { contains: () => true } })
    } });
    await h.press({ shiftKey: true });
    assert.deepEqual(h.copied, [`https://youtube.com/shorts/${id}`]);
});
test('live, unknown and invalid playback times fall back to plain links', async () => {
    for (const video of [{ duration: Infinity }, { duration: NaN }, { duration: 0 },
        { currentTime: NaN }, { currentTime: -1 }, { currentTime: Infinity }]) {
        const h = harness({ video });
        await h.press({ shiftKey: true });
        assert.deepEqual(h.copied, [`https://youtu.be/${id}`]);
    }
});
for (const [failure, writeText] of [
    ['throw', () => { throw new Error('clipboard unavailable'); }],
    ['rejection', async () => { throw new Error('IPC failed'); }]
]) test(`clipboard ${failure} does not announce success`, async (t) => {
    t.mock.method(console, 'error', () => {});
    const h = harness({ writeText });
    await h.press();
    assert.equal(h.notices(), 0);
    assert.equal(console.error.mock.callCount(), 1);
});

test('main process accepts only video URLs from the app YouTube renderer', () => {
    const copied = [];
    const { handlers, event } = clipboardHarness(url => copied.push(url));
    const handle = handlers.get('copy-video-link');
    for (const url of [`https://youtu.be/${id}`, `https://youtu.be/${id}?t=83`, `https://youtube.com/shorts/${id}`]) {
        handle(event, url);
        assert.equal(copied.at(-1), url);
    }
    for (const [source, url] of [
        [{ ...event, sender: {} }, `https://youtu.be/${id}`],
        [{ ...event, senderFrame: { url: 'https://www.youtube.com.evil.test/tv' } }, `https://youtu.be/${id}`],
        [{ ...event, senderFrame: null }, `https://youtu.be/${id}`],
        [event, 'https://example.com/'], [event, null], [event, `https://youtu.be/${id}?t=-1`]
    ]) assert.throws(() => handle(source, url), /Invalid video link/);
    assert.equal(copied.length, 3);
});

test('main process returns clipboard completion so IPC can acknowledge success or failure', async () => {
    let finish;
    const completion = new Promise(resolve => { finish = resolve; });
    const { handlers, event } = clipboardHarness(() => completion);
    const result = handlers.get('copy-video-link')(event, `https://youtu.be/${id}`);
    assert.equal(result, completion);
    finish();
    await result;
});

test('success toast waits until clipboard completion', async () => {
    let finish;
    const h = harness({ writeText: () => new Promise(resolve => { finish = resolve; }) });
    const pending = h.press();
    assert.equal(h.notices(), 0);
    finish();
    await pending;
    assert.equal(h.notices(), 1);
});

test('regular watch URLs and TV hash routes identify the same video', async () => {
    for (const baseURI of [
        `https://www.youtube.com/watch?v=${id}`,
        `https://www.youtube.com/tv#/watch?v=${id}`,
        `https://www.youtube.com/tv?env_enableMediaStreams=true#/watch?list=playlist&v=${id}`
    ]) {
        const h = harness({ video: { baseURI } });
        await h.press({ shiftKey: true });
        assert.deepEqual(h.copied, [`https://youtu.be/${id}?t=83`]);
    }
});

test('home/search routes and foreign hash URLs cannot copy a stale video', async () => {
    for (const baseURI of [
        `https://www.youtube.com/tv#/`,
        `https://www.youtube.com/tv#/search?v=${id}`,
        `https://www.youtube.com/tv#https://example.com/watch?v=${id}`
    ]) {
        const h = harness({ video: { baseURI } });
        await h.press();
        assert.deepEqual(h.copied, []);
    }
});

test('live DVR with a finite duration still copies a plain link', async () => {
    const h = harness({ document: {
        querySelector: selector => selector === '.html5-video-player'
            ? { getVideoData: () => ({ isLive: true }) } : null
    } });
    await h.press({ shiftKey: true });
    assert.deepEqual(h.copied, [`https://youtu.be/${id}`]);
});

test('native selection copying validates the sender and works without a video', async () => {
    const h = harness({ noVideo: true, document: { activeElement: { matches: () => true } } });
    await h.press();
    assert.equal(h.selections(), 1);
    assert.deepEqual(h.copied, []);

    let selections = 0;
    const { handlers, event } = clipboardHarness(undefined, { copy: () => selections++ });
    const copySelection = handlers.get('copy-selection');
    copySelection(event);
    assert.equal(selections, 1);
    assert.throws(() => copySelection({ ...event, sender: {} }), /Invalid clipboard/);
    assert.throws(() => copySelection({ ...event, senderFrame: { url: 'https://example.com' } }), /Invalid clipboard/);
    assert.equal(selections, 1);
});
