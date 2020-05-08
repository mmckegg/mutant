module.exports = MutantChannel

function MutantChannel () {
  var listeners = []
  return {
    listen (listener) {
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
    },
    broadcast (value) {
      var cachedListeners = listeners.slice(0)
      for (var i = 0, len = cachedListeners.length; i < len; i++) {
        cachedListeners[i](value)
      }
    }
  }
}