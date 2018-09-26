var onceIdle = require('../once-idle')

module.exports = LazyWatcher

function LazyWatcher (update, onBind, onUnbind, context) {
  if (!(this instanceof LazyWatcher)) return new LazyWatcher(update, onBind, onUnbind, context || this)

  this._lazy = false
  this._context = context
  this._updating = false
  this._boundUpdateAndBroadcast = this.updateAndBroadcast.bind(this)
  this._boundBroadcast = this.broadcast.bind(this)
  this.onUpdate = this.onUpdate.bind(this)
  this.checkUpdated = this.checkUpdated.bind(this)
  this._update = update
  this._onBind = onBind
  this._onUnbind = onUnbind

  this.live = false
  this.nextTick = false
  this.idle = false
  this.suspended = false
  this.update = update
  this.value = null
  this.listeners = []
}

LazyWatcher.prototype.broadcast = function () {
  if (this.nextTick) {
    if (!this._updating) {
      this._updating = true
      setImmediate(this._boundBroadcast)
    }
  } else {
    this._broadcast()
  }
}

LazyWatcher.prototype.transaction = function (value, cb) {
  var originalValue = this.suspended
  this.suspended = true
  cb(value)
  this.suspended = originalValue
  this.broadcast()
}

LazyWatcher.prototype.onUpdate = function () {
  if (this.idle) {
    if (!this._updating) {
      this._updating = true
      onceIdle(this._boundUpdateAndBroadcast)
    }
  } else if (this.nextTick) {
    if (!this._updating) {
      this._updating = true
      setImmediate(this._boundUpdateAndBroadcast)
    }
  } else {
    this.updateAndBroadcast()
  }
}

LazyWatcher.prototype.updateAndBroadcast = function () {
  this._updating = false
  if (this._update.call(this._context)) {
    this._broadcast()
  }
}

LazyWatcher.prototype.checkUpdated = function () {
  if (!this.live || this._lazy || this._updating) {
    this._lazy = false
    if (this.nextTick && this.live && this._lazy) {
      this.onUpdate() // use cached value to make more responsive
    } else {
      this._update.apply(this._context)
    }
  }
}

LazyWatcher.prototype.getValue = function () {
  this.checkUpdated()
  return this.value
}

LazyWatcher.prototype.removeListener = function (listener) {
  for (var i = 0, len = this.listeners.length; i < len; i++) {
    if (this.listeners[i] === listener) {
      this.listeners.splice(i, 1)
      break
    }
  }
  if (!this.listeners.length && this.live) {
    this.live = false
    this._onUnbind.apply(this._context)
  }
}

LazyWatcher.prototype.addListener = function (listener) {
  if (typeof listener !== 'function') {
    throw new Error('Listeners must be functions.')
  }

  this.listeners.push(listener)

  if (!this.live) {
    this.live = true
    this._lazy = true
    this._onBind.apply(this._context)
  }

  return this.removeListener.bind(this, listener)
}

LazyWatcher.prototype._broadcast = function () {
  if (!this.suspended) {
    var cachedListeners = this.listeners.slice(0)
    for (var i = 0, len = cachedListeners.length; i < len; i++) {
      cachedListeners[i](this.value)
    }
  }
}
