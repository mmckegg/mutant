module.exports = Observable

function Observable (value) {
  var listeners = []
  value = value === undefined ? null : value

  observable.set = function (v) {
    value = v

    for (var i = 0, len = listeners.length; i < len; i++) {
      listeners[i](v)
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
