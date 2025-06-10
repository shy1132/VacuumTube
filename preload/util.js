function resolveCommand(command) {
    for (let key in window._yttv) {
        if (window._yttv[key]?.instance?.resolveCommand) {
            window._yttv[key].instance.resolveCommand(command)
            return;
        }
    }
}

module.exports.toast = (title, subtitle) => {
    let toastCommand = {
        openPopupAction: {
            popupType: 'TOAST',
            popup: {
                overlayToastRenderer: {
                    title: {
                        simpleText: title,
                    },
                    subtitle: {
                        simpleText: subtitle
                    }
                }
            }
        }
    }

    resolveCommand(toastCommand)
}