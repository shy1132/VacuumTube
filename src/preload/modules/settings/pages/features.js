module.exports = {
    id: 'features',

    title: (locale) => locale.features.title,

    rows: (config, locale) => [
        {
            type: 'toggle',
            key: 'music_mode_feature',
            title: locale.features.settings.music_mode.title,
            description: locale.features.settings.music_mode.description,
            dependsOn: 'features_enabled'
        },
        {
            type: 'toggle',
            key: 'remaining_time',
            title: locale.features.settings.remaining_time.title,
            description: locale.features.settings.remaining_time.description,
            dependsOn: 'features_enabled'
        }
    ]
}