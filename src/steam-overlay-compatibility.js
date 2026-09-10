const COMPATIBILITY_SWITCHES = Object.freeze([
    'in-process-gpu',
    'disable-direct-composition'
])

function isSteamOverlayCompatibilitySupported(platform = process.platform) {
    return platform === 'win32';
}

function getCompatibilitySwitches(platform = process.platform) {
    if (!isSteamOverlayCompatibilitySupported(platform)) return [];

    return COMPATIBILITY_SWITCHES;
}

function appendSwitch(commandLine, name) {
    if (commandLine.hasSwitch?.(name)) return false;

    commandLine.appendSwitch(name)
    return true;
}

function applySteamOverlayCompatibilitySwitches({
    commandLine,
    config,
    platform = process.platform,
    logger = console
}) {
    if (!config?.steam_overlay_compatibility) return [];

    const switches = getCompatibilitySwitches(platform)
    if (switches.length === 0) {
        logger.warn?.('[Steam Overlay Compatibility] Startup switches are only applied on Windows.')
        return [];
    }

    const applied = []
    for (const name of switches) {
        if (appendSwitch(commandLine, name)) {
            applied.push(name)
        }
    }

    if (commandLine.hasSwitch?.('disable-gpu')) {
        logger.warn?.('[Steam Overlay Compatibility] --disable-gpu is also set; Steam overlay injection may still fail.')
    }

    if (applied.length > 0) {
        logger.log?.(`[Steam Overlay Compatibility] Applied Chromium switches: ${applied.join(', ')}`)
    }

    return applied;
}

module.exports = {
    COMPATIBILITY_SWITCHES,
    isSteamOverlayCompatibilitySupported,
    getCompatibilitySwitches,
    applySteamOverlayCompatibilitySwitches
}
