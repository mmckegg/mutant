var LazyWatcher = require('./lib/lazy-watcher')
var resolve = require('./resolve')
var isObservable = require('./is-observable')

module.exports = Proxy

function Proxy (source) {
  var releases = []

  var binder = LazyWatcher(update, listen, unlisten)
  binder.value = resolve(source)

  var observable = function MutantProxy (listener) {
    if (!listener) {
      return binder.getValue()
    }
    return binder.addListener(listener)
  }

  observable.get = function () {
    return source
  }

  observable.set = function (newSource) {
    unlisten()
    source = newSource
    if (binder.live) {
      listen()
    }
    binder.onUpdate()
  }

  return observable

  // scoped

  function listen () {
    if (isObservable(source)) {
      releases.push(
        source(binder.onUpdate)
      )
    }
  }

  function unlisten () {
    while (releases.length) {
      releases.pop()()
    }
  }

  function update () {
    binder.value = resolve(source)
    return true
  }
}
