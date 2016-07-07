/* A lazy binding take on computed */
// doesn't start watching observables until itself is watched, and then releases if unwatched
// avoids memory/watcher leakage

var resolve = require('./resolve')

module.exports = computed

function computed (observables, lambda) {
  var values = []
  var releases = []
  var computedValue = null
  var live = false
  var lazy = false
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
        if (typeof observables[i] === 'function') {
          releases.push(observables[i](onUpdate))
        }
      }
      live = true
      lazy = true
    }
  }

  function unlisten () {
    if (live) {
      live = false
      while (releases.length) {
        releases.pop()()
      }
    }
  }

  function update () {
    var changed = false
    for (var i = 0, len = observables.length; i < len; i++) {
      var newValue = resolve(observables[i])
      if (newValue !== values[i] || typeof newValue === 'object') {
        changed = true
        values[i] = newValue
      }
    }

    if (changed) {
      var newComputedValue = lambda.apply(null, values)
      if (newComputedValue !== computedValue || typeof newComputedValue === 'object') {
        computedValue = newComputedValue
        return true
      }
    }
    return false
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
