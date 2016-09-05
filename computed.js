/* A lazy binding take on computed */
// - doesn't start watching observables until itself is watched, and then releases if unwatched
// - avoids memory/watcher leakage
// - attaches to inner observables if these are returned from value
// - doesn't broadcast if value is same as last value (and is `value type` or observable - can't make assuptions about reference types)
// - doesn't broadcast if value is computed.NO_CHANGE

var resolve = require('./resolve')
var isObservable = require('./is-observable')

module.exports = computed

computed.NO_CHANGE = {}

function computed (observables, lambda, opts) {
  var instance = new ProtoComputed(observables, lambda, opts)
  return instance.MutantComputed.bind(instance)
}

// optimise memory usage
function ProtoComputed (observables, lambda, opts) {
  if (!Array.isArray(observables)) {
    observables = [observables]
  }
  this.values = []
  this.releases = []
  this.computedValue = []
  this.inner = null
  this.updating = false
  this.live = false
  this.lazy = false
  this.initialized = false
  this.listeners = []
  this.observables = observables
  this.lambda = lambda
  this.opts = opts
  this.boundOnUpdate = this.onUpdate.bind(this)
  this.boundOnInnerUpdate = this.onInnerUpdate.bind(this)
  this.boundUpdateNow = this.updateNow.bind(this)
}

ProtoComputed.prototype = {
  MutantComputed: function (listener) {
    if (!listener) {
      return this.getValue()
    }

    if (typeof listener !== 'function') {
      throw new Error('Listeners must be functions.')
    }

    this.listeners.push(listener)
    this.listen()

    return this.removeListener.bind(this, listener)
  },
  removeListener: function (listener) {
    for (var i = 0, len = this.listeners.length; i < len; i++) {
      if (this.listeners[i] === listener) {
        this.listeners.splice(i, 1)
        break
      }
    }
    if (!this.listeners.length) {
      this.unlisten()
    }
  },
  listen: function () {
    if (!this.live) {
      for (var i = 0, len = this.observables.length; i < len; i++) {
        if (isObservable(this.observables[i])) {
          this.releases.push(this.observables[i](this.boundOnUpdate))
        }
      }
      if (this.inner) {
        this.releaseInner = this.inner(this.boundOnInnerUpdate)
      }
      this.live = true
      this.lazy = true
    }
  },
  unlisten: function () {
    if (this.live) {
      this.live = false

      if (this.releaseInner) {
        this.releaseInner()
        this.releaseInner = null
      }

      while (this.releases.length) {
        this.releases.pop()()
      }
    }
  },
  update: function () {
    var changed = false
    for (var i = 0, len = this.observables.length; i < len; i++) {
      var newValue = resolve(this.observables[i])
      if (newValue !== this.values[i] || this.isMutable(newValue)) {
        changed = true
        this.values[i] = newValue
      }
    }

    if (changed || !this.initialized) {
      this.initialized = true
      var newComputedValue = this.lambda.apply(null, this.values)

      if (newComputedValue === computed.NO_CHANGE) {
        return false
      }

      if (newComputedValue !== this.computedValue || (this.isMutable(newComputedValue) && !isObservable(newComputedValue))) {
        if (this.releaseInner) {
          this.releaseInner()
          this.inner = this.releaseInner = null
        }

        if (isObservable(newComputedValue)) {
          // handle returning observable from computed
          this.computedValue = newComputedValue()
          this.inner = newComputedValue
          if (this.live) {
            this.releaseInner = this.inner(this.boundOnInnerUpdate)
          }
        } else {
          this.computedValue = newComputedValue
        }
        return true
      }
    }
    return false
  },
  onUpdate: function () {
    if (this.opts && this.opts.nextTick) {
      if (!this.updating) {
        this.updating = true
        setImmediate(this.boundUpdateNow)
      }
    } else {
      this.updateNow()
    }
  },
  onInnerUpdate: function (value) {
    if (value !== this.computedValue || this.isMutable(this.computedValue)) {
      this.computedValue = value
      this.broadcast()
    }
  },
  updateNow: function () {
    this.updating = false
    if (this.update()) {
      this.broadcast()
    }
  },
  getValue: function () {
    if (!this.live || this.lazy) {
      this.lazy = false
      this.update()
    }
    return this.computedValue
  },
  isMutable: function (value) {
    if (this.opts && this.opts.immutableTypes && isInstanceOfAny(value, this.opts.immutableTypes)) {
      return false
    } else {
      return isReferenceType(value)
    }
  },
  broadcast: function () {
    // cache listeners in case modified during broadcast
    var listeners = this.listeners.slice(0)
    for (var i = 0, len = listeners.length; i < len; i++) {
      listeners[i](this.computedValue)
    }
  }
}

function isReferenceType (value) {
  return typeof value === 'object' && value !== null
}

function isInstanceOfAny (object, types) {
  var result = false
  for (var i = 0; i < types.length; i++) {
    if (object instanceof types[i]) {
      result = true
      break
    }
  }
  return result
}
