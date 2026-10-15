module.exports = {
    id: 'music-info',
    title: locale => locale.features.settings.music_mode.title,
    details: locale => ({
        ...locale.feature_info.music,
        title: locale.features.settings.music_mode.title,
        icon: 'audio-lines',
        contributors: ['@jaxsnjohnson'],
        source: {
            label: locale.feature_info.original_contribution,
            url: 'https://github.com/shy1132/VacuumTube/pull/211'
        }
    })
}
