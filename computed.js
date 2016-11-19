/* A lazy binding take on computed */
// - doesn't start watching observables until itself is watched, and then releases if unwatched
// - avoids memory/watcher leakage
// - attaches to inner observables if these are returned from value
// - doesn't broadcast if value is same as last value (and is `value type` or observable - can't make assuptions about reference types)
// - doesn't broadcast if value is computed.NO_CHANGE

var resolve = require('./resolve')
var isObservable = require('./is-observable')
var isSame = require('./lib/is-same')
var onceIdle = require('./once-idle')

module.exports = computed

computed.NO_CHANGE = {}
computed.extended = extendedComputed

function computed (observables, lambda, opts) {
  // opts: nextTick, comparer, context
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
  this.computedValue = null
  this.outputValue = null
  this.inner = null
  this.updating = false
  this.live = false
  this.lazy = false
  this.initialized = false
  this.listeners = []
  this.observables = observables
  this.lambda = lambda
  this.opts = opts
  this.comparer = opts && opts.comparer || null
  this.context = opts && opts.context || {}
  this.boundOnUpdate = this.onUpdate.bind(this)
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
        this.releaseInner = this.inner(this.onInnerUpdate.bind(this, this.inner))
      }
      this.live = true
      this.lazy = true

      if (this.opts && this.opts.onListen) {
        var release = this.opts.onListen()
        if (typeof release === 'function') {
          this.releases.push(release)
        }
      }
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

      if (this.opts && this.opts.onUnlisten) {
        this.opts.onUnlisten()
      }
    }
  },
  update: function () {
    var changed = false
    for (var i = 0, len = this.observables.length; i < len; i++) {
      var newValue = resolve(this.observables[i])
      if (!isSame(newValue, this.values[i], this.comparer)) {
        changed = true
        this.values[i] = newValue
      }
    }

    if (changed || !this.initialized) {
      this.initialized = true
      var newComputedValue = this.lambda.apply(this.context, this.values)

      if (newComputedValue === computed.NO_CHANGE) {
        return false
      }

      if (!isSame(newComputedValue, this.computedValue, this.comparer)) {
        if (this.releaseInner) {
          this.releaseInner()
          this.inner = this.releaseInner = null
        }

        this.computedValue = newComputedValue

        if (isObservable(newComputedValue)) {
          // handle returning observable from computed
          this.outputValue = newComputedValue()
          this.inner = newComputedValue
          if (this.live) {
            this.releaseInner = this.inner(this.onInnerUpdate.bind(this, this.inner))
          }
        } else {
          this.outputValue = this.computedValue
        }
        return true
      }
    }
    return false
  },
  onUpdate: function () {
    if (this.opts && this.opts.idle) {
      if (!this.updating) {
        this.updating = true
        onceIdle(this.boundUpdateNow)
      }
    } else if (this.opts && this.opts.nextTick) {
      if (!this.updating) {
        this.updating = true
        setImmediate(this.boundUpdateNow)
      }
    } else {
      this.updateNow()
    }
  },
  onInnerUpdate: function (obs, value) {
    if (obs === this.inner) {
      if (!isSame(value, this.outputValue, this.comparer)) {
        this.outputValue = value
        this.broadcast()
      }
    }
  },
  updateNow: function () {
    this.updating = false
    if (this.update()) {
      this.broadcast()
    }
  },
  getValue: function () {
    if (!this.live || this.lazy || this.updating) {
      this.lazy = false
      if (this.opts && this.opts.nextTick && this.live && this.lazy) {
        this.onUpdate() // use cached value to make more responsive
      } else {
        this.update()
      }
      if (this.inner) {
        this.outputValue = resolve(this.inner)
      }
    }
    return this.outputValue
  },
  broadcast: function () {
    // cache listeners in case modified during broadcast
    var listeners = this.listeners.slice(0)
    for (var i = 0, len = listeners.length; i < len; i++) {
      listeners[i](this.outputValue)
    }
  }
}

function extendedComputed (observables, update) {
  var live = false
  var lazy = false

  var instance = computed(observables, function () {
    return update()
  }, {
    onListen: function () { live = lazy = true },
    onUnlisten: function () { live = false }
  })

  instance.checkUpdated = function () {
    if (!live || lazy) {
      lazy = false
      update()
    }
  }

  return instance
}
