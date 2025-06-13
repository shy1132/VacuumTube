const { settings } = require("../util.js");
const { popupMenu, link } = require("../ui.js");

const menu = popupMenu({
    title: "VacuumTube Settings",
    items: [
        link({
            title: "Ad Block",
            createSubMenu: () => {
                let isEnabled = settings.getBool("ad-blocker-enabled", true);
                return popupMenu({
                    title: "Ad Block",
                    selectedIndex: isEnabled ? 0 : 1,
                    items: [
                        link({
                            title: "Enable",
                            icon: isEnabled ? "CHECK" : undefined,
                            closeMenu: true,
                            callback: () =>
                                settings.setBool("ad-blocker-enabled", true),
                        }),
                        link({
                            title: "Disable",
                            icon: !isEnabled ? "CHECK" : undefined,
                            closeMenu: true,
                            callback: () =>
                                settings.setBool("ad-blocker-enabled", false),
                        }),
                    ],
                });
            },
        }),
    ],
});

module.exports = () => {
    let jsonParse = JSON.parse;

    JSON.parse = (...args) => {
        let json = jsonParse.apply(this, args);

        try {
            if (json["items"]?.at(0)?.settingCategoryCollectionRenderer) {
                json.items = [
                    {
                        settingCategoryCollectionRenderer: {
                            categoryId: "SETTINGS_CAT_VACUMETUBE",
                            focused: false,
                            items: [
                                {
                                    settingSingleOptionMenuRenderer: {
                                        title: {
                                            runs: [
                                                { text: "VacuumTube Settings" },
                                            ],
                                        },
                                        button: {
                                            buttonRenderer: {
                                                text: {
                                                    simpleText: "Open Settings",
                                                },
                                                icon: {
                                                    iconType: "SETTINGS",
                                                },
                                                command: menu,
                                            },
                                        },
                                    },
                                },
                            ],
                        },
                    },
                    ...json.items,
                ];
            }

            return json;
        } catch (err) {
            console.error("settings JSON.parse override failed", err);
            return json; //just to be safe, return what we have
        }
    };
};
