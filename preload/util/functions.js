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
            if (updates[key] === '__DELETE__') {
                delete current[key];
            } else {
                current[key] = updates[key]
            }
        } else {
            deepMerge(current[key], updates[key])
        }
    }

    return current;
}

function displayNotification(message, timeout = 4000) {
    if (!document.querySelector('.ytaf-notification-container')) {
        const c = document.createElement('div');
        c.classList.add('ytaf-notification-container');
        document.body.appendChild(c);
    }

    const element = document.createElement('div');
    const innerElement = document.createElement('div');
    innerElement.innerText = message;
    innerElement.classList.add('message');
    innerElement.classList.add('message-hidden');
    element.appendChild(innerElement);
    document.querySelector('.ytaf-notification-container').appendChild(element);

    setTimeout(() => {
        element.classList.remove('message-hidden');
    }, 100);
    setTimeout(() => {
        innerElement.classList.add('message-hidden');
        setTimeout(() => {
            element.remove();
        }, 1000);
    }, timeout);
}

module.exports = {
    waitForSelector,
    waitForCondition,
    deepMerge
}