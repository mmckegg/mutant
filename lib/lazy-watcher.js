module.exports = function (update, onBind, onUnbind) {
  var lazy = false
  var context = this

  var obj = {
    live: false,
    suspended: false,
    broadcast: broadcast,
    update: update,
    value: null,
    listeners: [],

    transaction: function (value, cb) {
      var originalValue = obj.suspended
      obj.suspended = true
      cb(value)
      obj.suspended = originalValue
      obj.broadcast()
    },

    onUpdate: function () {
      if (update.apply(context)) {
        broadcast()
      }
    },

    checkUpdated: function () {
      if (!obj.live || lazy) {
        lazy = false
        update.apply(context)
      }
    },

    getValue: function () {
      obj.checkUpdated.apply(context)
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
        onBind.apply(context)
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
          onUnbind.apply(context)
        }
      }
    }
  }

  return obj

  // scoped

  function broadcast () {
    if (!obj.suspended) {
      var cachedListeners = obj.listeners.slice(0)
      for (var i = 0, len = cachedListeners.length; i < len; i++) {
        cachedListeners[i](obj.value)
      }
    }
  }
}
