async function waitForSelector(selector) {
    return new Promise((resolve) => {
        let observer = new MutationObserver(() => {
            let el = document.querySelector(selector)
            if (el) {
                resolve(el)
                observer.disconnect()
            }
        })

        observer.observe(document.documentElement, {
            childList: true,
            subtree: true
        })

        let el = document.querySelector(selector)
        if (el) {
            resolve(el)
            observer.disconnect()
        }
    });
}

async function waitForCondition(func) {
    return await new Promise((resolve) => {
        if (func()) return resolve();

        let interval = setInterval(() => {
            if (!func()) return;

            clearInterval(interval)
            resolve()
        }, 10)
    });
}

function deepMerge(current, updates) {
    for (key of Object.keys(updates)) {
        if (!current.hasOwnProperty(key) || typeof updates[key] !== 'object') {
            current[key] = updates[key]
        } else {
            deepMerge(current[key], updates[key])
        }
    }

    return current;
}

module.exports = {
    waitForSelector,
    waitForCondition,
    deepMerge
}