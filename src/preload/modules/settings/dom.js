//shared element builders for the settings overlay

const functions = require('../../util/functions')

const el = functions.el;

//a single on/off toggle switch bound to a config key
function createToggle(configKey, on) {
    return el('div', { className: `vt-toggle ${on ? 'vt-toggle-on' : ''}`, dataConfig: configKey }, [
        el('div', { className: 'vt-toggle-track' }, [
            el('div', { className: 'vt-toggle-thumb' })
        ])
    ]);
}

//a standard "title + description + toggle" settings row
function createSettingItem(configKey, title, description, on, focused = false) {
    return el('div', {
        className: `vt-setting-item ${focused ? 'vt-item-focused' : ''}`,
        dataSetting: configKey,
        dataIndex: '0'
    }, [
        el('div', { className: 'vt-setting-info' }, [
            el('span', { className: 'vt-setting-title', textContent: title }),
            el('span', { className: 'vt-setting-description', textContent: description })
        ]),
        el('div', { className: 'vt-setting-control' }, [
            createToggle(configKey, on)
        ])
    ]);
}

//a tab in the left-hand tab strip
function createTab(id, label, index, selected = false) {
    return el('div', {
        className: `vt-tab ${selected ? 'vt-tab-selected' : ''}`,
        dataTab: id,
        dataIndex: String(index)
    }, [
        el('span', { className: 'vt-tab-label', textContent: label })
    ]);
}

module.exports = {
    el,
    createToggle,
    createSettingItem,
    createTab
}