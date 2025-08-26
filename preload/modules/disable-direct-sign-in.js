//"Sign in with your remote" is very buggy and broken in VacuumTube (sometimes breaks module injection, can't use controller, and also simply doesn't work in the end), so we disable it

const configOverrides = require('../util/configOverrides')

module.exports = async () => {
    configOverrides.tectonicConfigOverrides.push({
        featureSwitches: {
            directSignInConfig: {
                isSupported: false
            }
        }
    })
}