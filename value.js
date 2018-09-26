module.exports = function createObservable (value, opts) {
  var state = {
    value: getValue(value, opts),
    listeners: [],
    opts: opts
  }

  var observable = MutantValue.bind(state)
  observable.set = set.bind(state)
  return observable
}

function MutantValue (listener) {
  if (!listener) {
    return this.value
  }

  if (typeof listener !== 'function') {
    throw new Error('Listeners must be functions.')
  }

  this.listeners.push(listener)
  return unlisten.bind(this, listener)
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

function set (value) {
  this.value = getValue(value, this.opts)
  broadcast(this.listeners, this.value)
}

function unlisten (listener) {
  for (var i = 0, len = this.listeners.length; i < len; i++) {
    if (this.listeners[i] === listener) {
      this.listeners.splice(i, 1)
      break
    }
  }
}

function broadcast (listeners, value) {
  var cachedListeners = listeners.slice(0)
  for (var i = 0, len = cachedListeners.length; i < len; i++) {
    cachedListeners[i](value)
  }
}
