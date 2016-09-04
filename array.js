var LazyWatcher = require('./lib/lazy-watcher')
var isReferenceType = require('./lib/is-reference-type')
var resolve = require('./resolve')

module.exports = Array

function Array (defaultValues) {
  var object = []
  var sources = []
  var releases = []

  var binder = LazyWatcher(update, listen, unlisten)
  binder.value = object

  if (defaultValues && defaultValues.length) {
    defaultValues.forEach(add)
  }

  var observable = function MutantArray (listener) {
    if (!listener) {
      return binder.getValue()
    }
    return binder.addListener(listener)
  }

  observable.push = function (args) {
    for (var i = 0; i < arguments.length; i++) {
      add(arguments[i])
    }
    binder.broadcast()
  }

  observable.insert = function (valueOrObs, at) {
    sources.splice(at, 0, valueOrObs)
    if (binder.live) releases.splice(at, 0, bind(valueOrObs))
    object.splice(at, 0, resolve(valueOrObs))
    binder.broadcast()
  }

  observable.get = function (index) {
    return sources[index]
  }

  observable.getLength = function (index) {
    return sources.length
  }

  observable.includes = function (valueOrObs) {
    return !!~sources.indexOf(valueOrObs)
  }

  observable.indexOf = function (valueOrObs) {
    return sources.indexOf(valueOrObs)
  }

  observable.indexOf

  observable.pop = function () {
    var result = sources.pop()
    if (binder.live) tryInvoke(releases.pop())
    object.pop()
    binder.broadcast()
    return result
  }

  observable.shift = function () {
    var result = sources.shift()
    if (binder.live) tryInvoke(releases.shift())
    object.shift()
    binder.broadcast()
    return result
  }

  observable.clear = function () {
    releases.forEach(tryInvoke)
    sources.length = 0
    releases.length = 0
    object.length = 0
    binder.broadcast()
  }

  observable.delete = function (valueOrObs) {
    var index = sources.indexOf(valueOrObs)
    if (~index) {
      sources.splice(index, 1)
      if (binder.live) releases.splice(index, 1).forEach(tryInvoke)
      object.splice(index, 1)
      binder.broadcast()
    }
  }

  observable.set = function (values) {
    unlisten()
    sources.length = 0
    releases.length = 0
    object.length = 0
    values.forEach(add)
    if (binder.live) {
      listen()
      binder.broadcast()
    }
  }

  return observable

  // scoped

  function add (valueOrObs) {
    sources.push(valueOrObs)
    if (binder.live) {
      releases.push(bind(valueOrObs))
    }
    object.push(resolve(valueOrObs))
  }

  function bind (valueOrObs) {
    return typeof valueOrObs === 'function' ? valueOrObs(binder.onUpdate) : null
  }

  function listen () {
    sources.forEach(function (obs, i) {
      releases[i] = bind(obs)
    })
  }

  function unlisten () {
    releases.forEach(tryInvoke)
    releases.length = 0
  }

  function update () {
    var changed = false
    sources.forEach(function (key, i) {
      var newValue = resolve(observable[key])
      if (newValue !== object[i] || isReferenceType(newValue)) {
        object[i] = newValue
        changed = true
      }
    })
    return changed
  }
}

function tryInvoke (func) {
  if (typeof func === 'function') {
    func()
  }
}
