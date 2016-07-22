module.exports = Observable

function Observable (value) {
  var listeners = []
  value = value === undefined ? null : value

  observable.set = function (v) {
    value = v

    var cachedListeners = listeners.slice(0)
    for (var i = 0, len = cachedListeners.length; i < len; i++) {
      cachedListeners[i](v)
    }
  }

  return observable

  function observable (listener) {
    if (!listener) {
      return value
    }

    if (typeof listener !== 'function') {
      throw new Error('Listeners must be functions.')
    }

    listeners.push(listener)

    return function remove () {
      for (var i = 0, len = listeners.length; i < len; i++) {
        if (listeners[i] === listener) {
          listeners.splice(i, 1)
          break
        }
      }
    }
  }
}
