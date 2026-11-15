const configManager = require('../../../config');

const TIMEOUT_OPTIONS = [ 1, 2, 3, 5, 10, 15, 20, 25, 30 ];
const DIM_OPTIONS = [ 25, 50, 75, 90, 100 ];

module.exports = {
    id: 'screensaver',

    title: (locale) => locale.screensaver?.options_link || 'Screensaver Options',
    description: (locale) => locale.screensaver?.options_description || 'Configure inactivity timeout and dimming level.',

    sections: (config, locale) => [
        {
            title: locale.screensaver?.timeout_section || 'Inactivity Timeout',
            rows: TIMEOUT_OPTIONS.map((minutes) => ({
                type: 'toggle',
                id: `screensaver-timeout-${minutes}`,
                title: `${minutes} minute${minutes > 1 ? 's' : ''}`,
                get: (cfg) => (cfg.screensaver_timeout ?? 5) === minutes,
                set: () => configManager.set({ screensaver_timeout: minutes })
            }))
        },
        {
            title: locale.screensaver?.dim_section || 'Dimming Level',
            rows: DIM_OPTIONS.map((percentage) => ({
                type: 'toggle',
                id: `screensaver-dim-${percentage}`,
                title: percentage === 100 ? '100% (Complete Black)' : `${percentage}%`,
                get: (cfg) => (cfg.screensaver_dim_percentage ?? 75) === percentage,
                set: () => configManager.set({ screensaver_dim_percentage: percentage })
            }))
        }
    ]
};
