var LazyWatcher = require('./lib/lazy-watcher')
var resolve = require('./resolve')
var isObservable = require('./is-observable')

module.exports = ProxyDict

function ProxyDict (source, opts) {
  var releases = []

  var binder = LazyWatcher(update, listen, unlisten)
  binder.value = resolve(source)

  if (opts && opts.nextTick) binder.nextTick = true
  if (opts && opts.idle) binder.idle = true

  var observable = function MutantProxyDict (listener) {
    if (!listener) {
      return binder.getValue()
    }
    return binder.addListener(listener)
  }

  observable.get = function (key) {
    if (isObservable(source) && source.get) {
      return source.get(key)
    } else if (resolve(source)) {
      return resolve(source)[key]
    }
  }

  observable.keys = function () {
    if (isObservable(source) && source.keys) {
      return resolve(source.keys)
    } else if (resolve(source)) {
      return Object.keys(resolve(source))
    } else {
      return []
    }
  }

  observable.has = function (key) {
    if (isObservable(source) && source.has) {
      return source.has(key)
    } else if (resolve(source)) {
      return key in resolve(source)
    }
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
    binder.value = resolve(source) || {}
    return true
  }
}
