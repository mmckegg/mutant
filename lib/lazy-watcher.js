var onceIdle = require('../once-idle')

module.exports = function (update, onBind, onUnbind) {
  var lazy = false
  var context = this
  var updating = false

  var obj = {
    live: false,
    nextTick: false,
    idle: false,
    suspended: false,
    update: update,
    value: null,
    listeners: [],

    broadcast: function () {
      if (obj.nextTick) {
        if (!updating) {
          updating = true
          setImmediate(broadcast)
        }
      } else {
        broadcast()
      }
    },

    transaction: function (value, cb) {
      var originalValue = obj.suspended
      obj.suspended = true
      cb(value)
      obj.suspended = originalValue
      obj.broadcast()
    },

    onUpdate: function () {
      if (obj.idle) {
        if (!updating) {
          updating = true
          onceIdle(obj.updateAndBroadcast)
        }
      } else if (obj.nextTick) {
        if (!updating) {
          updating = true
          setImmediate(obj.updateAndBroadcast)
        }
      } else {
        obj.updateAndBroadcast()
      }
    },

    updateAndBroadcast: function () {
      updating = false
      if (update.call(context)) {
        broadcast()
      }
    },

    checkUpdated: function () {
      if (!obj.live || lazy || updating) {
        lazy = false
        if (obj.nextTick && obj.live && lazy) {
          obj.onUpdate() // use cached value to make more responsive
        } else {
          update.apply(context)
        }
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
