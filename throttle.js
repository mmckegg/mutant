var LazyWatcher = require('./lib/lazy-watcher')
var watchThrottle = require('./watch-throttle')
var resolve = require('./resolve')

module.exports = function Throttle (input, minDelay) {
  // default delay is 20 ms
  minDelay = minDelay || 20

  var binder = LazyWatcher(update, listen, unlisten)
  binder.value = resolve(input)
  var releases = []

  var result = function MutantThrottle (listener) {
    if (!listener) {
      return binder.getValue()
    }
    return binder.addListener(listener)
  }

  function update () {
    binder.value = resolve(input)
    return true
  }

  function listen () {
    releases.push(watchThrottle(input, minDelay, binder.onUpdate))
  }

  function unlisten () {
    while (releases.length) {
      releases.pop()()
    }
  }

  return result
}
