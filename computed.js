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

function computed (observables, lambda) {
  if (!Array.isArray(observables)) {
    observables = [observables]
  }

  var values = []
  var releases = []
  var computedValue = null

  var inner = null
  var releaseInner = null

  var live = false
  var lazy = false
  var initialized = false
  var listeners = []

  var result = function (listener) {
    if (!listener) {
      return getValue()
    }

    if (typeof listener !== 'function') {
      throw new Error('Listeners must be functions.')
    }

    listeners.push(listener)
    listen()

    return function remove () {
      for (var i = 0, len = listeners.length; i < len; i++) {
        if (listeners[i] === listener) {
          listeners.splice(i, 1)
          break
        }
      }
      if (!listeners.length) {
        unlisten()
      }
    }
  }

  return result

  // scoped

  function listen () {
    if (!live) {
      for (var i = 0, len = observables.length; i < len; i++) {
        if (isObservable(observables[i])) {
          releases.push(observables[i](onUpdate))
        }
      }
      if (inner) {
        releaseInner = inner(onInnerUpdate)
      }
      live = true
      lazy = true
    }
  }

  function unlisten () {
    if (live) {
      live = false

      if (releaseInner) {
        releaseInner()
        releaseInner = null
      }

      while (releases.length) {
        releases.pop()()
      }
    }
  }

  function update () {
    var changed = false
    for (var i = 0, len = observables.length; i < len; i++) {
      var newValue = resolve(observables[i])
      if (newValue !== values[i] || isReferenceType(newValue)) {
        changed = true
        values[i] = newValue
      }
    }

    if (changed || !initialized) {
      initialized = true
      var newComputedValue = lambda.apply(null, values)

      if (newComputedValue === computed.NO_CHANGE) {
        return false
      }

      if (newComputedValue !== computedValue || (isReferenceType(newComputedValue) && !isObservable(newComputedValue))) {
        if (releaseInner) {
          releaseInner()
          inner = releaseInner = null
        }

        if (isObservable(newComputedValue)) {
          // handle returning observable from computed
          computedValue = newComputedValue()
          inner = newComputedValue
          if (live) {
            releaseInner = inner(onInnerUpdate)
          }
        } else {
          computedValue = newComputedValue
        }
        return true
      }
    }
    return false
  }

  function onInnerUpdate (value) {
    if (value !== computedValue || isReferenceType(computedValue)) {
      computedValue = value
      for (var i = 0, len = listeners.length; i < len; i++) {
        listeners[i](computedValue)
      }
    }
  }

  function onUpdate () {
    if (update()) {
      for (var i = 0, len = listeners.length; i < len; i++) {
        listeners[i](computedValue)
      }
    }
  }

  function getValue () {
    if (!live || lazy) {
      lazy = false
      update()
    }
    return computedValue
  }
}

function isReferenceType (value) {
  return typeof value === 'object' && value !== null
}
