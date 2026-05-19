function el(tag, attrs = {}, children = []) {
    const element = document.createElement(tag)
    for (const [ key, value ] of Object.entries(attrs)) {
        if (key === 'className') {
            element.className = value;
        } else if (key === 'textContent') {
            element.textContent = value;
        } else if (key === 'style' && typeof value === 'object') {
            Object.assign(element.style, value)
        } else if (key.startsWith('data')) {
            element.setAttribute(key.replace(/([A-Z])/g, '-$1').toLowerCase(), value)
        } else {
            element.setAttribute(key, value)
        }
    }

    for (const child of children) {
        if (child) element.appendChild(child)
    }

    return element;
}

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

module.exports = {
    el,
    waitForSelector,
    waitForCondition,
    deepMerge
}