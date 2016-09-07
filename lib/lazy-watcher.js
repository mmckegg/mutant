module.exports = function (update, onBind, onUnbind) {
  var lazy = false

  var obj = {
    live: false,
    broadcast: broadcast,
    update: update,
    value: null,
    listeners: [],

    onUpdate: function () {
      if (update()) {
        broadcast()
      }
    },

    getValue: function () {
      if (!obj.live || lazy) {
        lazy = false
        update()
      }
      return obj.value
    },

    addListener: function (listener) {
      if (typeof listener !== 'function') {
        throw new Error('Listeners must be functions.')
      }

      obj.listeners.push(listener)

      if (!obj.live) {
        obj.live = true
        lazy = true
        onBind()
      }

      return function release () {
        for (var i = 0, len = obj.listeners.length; i < len; i++) {
          if (obj.listeners[i] === listener) {
            obj.listeners.splice(i, 1)
            break
          }
        }
        if (!obj.listeners.length && obj.live) {
          obj.live = false
          onUnbind()
        }
      }
    }
  }

  return obj

  // scoped

  function broadcast () {
    var cachedListeners = obj.listeners.slice(0)
    for (var i = 0, len = cachedListeners.length; i < len; i++) {
      cachedListeners[i](obj.value)
    }
  }
}
