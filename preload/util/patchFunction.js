//generic function patcher

function patchFunction(obj, func, modifier) {
    let originalFunc = obj[func]

    let patched = function(...args) {
        return modifier.call(this, originalFunc, ...args);
    }

    obj[func] = patched;
}

module.exports = patchFunction;