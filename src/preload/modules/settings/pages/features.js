module.exports = {
    id: 'features',

    title: (locale) => locale.features.title,

    rows: (config, locale) => [
        {
            type: 'toggle',
            key: 'music_mode_feature',
            title: locale.features.music_mode_feature_title,
            description: locale.features.music_mode_feature_description,
            dependsOn: 'features_enabled'
        },
        {
            type: 'toggle',
            key: 'remaining_time',
            dependsOn: 'features_enabled'
        }
    ]
}