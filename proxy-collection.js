var LazyWatcher = require('./lib/lazy-watcher')
var resolve = require('./resolve')
var isObservable = require('./is-observable')

module.exports = ProxyCollection

function ProxyCollection (source, opts) {
  var releases = []

  var binder = LazyWatcher(update, listen, unlisten)
  binder.value = resolve(source)

  if (opts && opts.nextTick) {
    binder.nextTick = true
  }

  var observable = function MutantProxyCollection (listener) {
    if (!listener) {
      return binder.getValue()
    }
    return binder.addListener(listener)
  }

  observable.get = function (index) {
    if (isObservable(source) && source.get) {
      return source.get(index)
    } else if (Array.isArray(resolve(source))) {
      return resolve(source)[index]
    }
  }

  observable.getLength = function () {
    if (isObservable(source) && source.getLength) {
      return source.getLength()
    } else if (Array.isArray(resolve(source))) {
      return resolve(source).length
    }
  }

  observable.includes = function (value) {
    if (isObservable(source) && source.includes) {
      return source.includes(value)
    } else if (Array.isArray(resolve(source))) {
      return !!~resolve(source).indexOf(value)
    }
  }

  observable.indexOf = function (value) {
    if (isObservable(source) && source.indexOf) {
      return source.indexOf(value)
    } else if (Array.isArray(resolve(source))) {
      return resolve(source).indexOf(value)
    }
  }

  observable.forEach = function (fn, context) {
    if (isObservable(source) && source.forEach) {
      return source.forEach(fn, context)
    } else if (Array.isArray(resolve(source))) {
      return resolve(source).slice().forEach(fn, context)
    }
  }

  observable.find = function (fn) {
    if (isObservable(source) && source.find) {
      return source.find(fn)
    } else if (Array.isArray(resolve(source))) {
      return resolve(source).find(fn)
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
