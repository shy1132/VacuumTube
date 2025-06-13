function resolveCommand(command) {
    for (let key in window._yttv) {
        if (window._yttv[key]?.instance?.resolveCommand) {
            window._yttv[key].instance.resolveCommand(command);
            return;
        }
    }
}

module.exports.toast = (title, subtitle) => {
    let toastCommand = {
        openPopupAction: {
            popupType: "TOAST",
            popup: {
                overlayToastRenderer: {
                    title: {
                        simpleText: title,
                    },
                    subtitle: {
                        simpleText: subtitle,
                    },
                },
            },
        },
    };

    resolveCommand(toastCommand);
};

module.exports.settings = {
    setBool(key, value) {
        localStorage.setItem("vacuum-tube." + key, value ? "true" : "false");
    },

    getBool(key, defaultValue) {
        const value = localStorage.getItem("vacuum-tube." + key);
        if (value === null || value === undefined) {
            return defaultValue;
        }
        return value === "true";
    },
};
