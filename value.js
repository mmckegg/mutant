module.exports = Observable

function Observable (value, opts) {
  var listeners = []
  value = getValue(value, opts)

  observable.set = function (v) {
    value = getValue(v, opts)

    var cachedListeners = listeners.slice(0)
    for (var i = 0, len = cachedListeners.length; i < len; i++) {
      cachedListeners[i](value)
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

function getValue (value, opts) {
  if (value == null) {
    if (opts && opts.defaultValue != null) {
      value = opts.defaultValue
    } else {
      value = null
    }
  }
  return value
}
