//shared util for VacuumTube's shortcuts

function isSettingsOpen() {
    let root = document.getElementById('vt-settings-overlay-root')
    return !!root && !root.classList.contains('vt-settings-hidden');
}

//whether a keydown should trigger a shortcut
function isShortcutKey(e) {
    if (e.ctrlKey || e.altKey || e.metaKey) return false;
    return !isSettingsOpen();
}

module.exports = {
    isShortcutKey,
    isSettingsOpen
}