var LazyWatcher = require('./lib/lazy-watcher')

module.exports = Set

function Set (defaultValues) {
  var object = []
  var sources = []
  var releases = []

  var binder = LazyWatcher(update, listen, unlisten)
  binder.value = object

  if (defaultValues && defaultValues.length) {
    defaultValues.forEach(function (valueOrObs) {
      if (!~sources.indexOf(valueOrObs)) {
        sources.push(valueOrObs)
      }
    })
    update()
  }

  var observable = function MutantSet (listener) {
    if (!listener) {
      return binder.getValue()
    }
    return binder.addListener(listener)
  }

  observable.add = function (valueOrObs) {
    if (!~sources.indexOf(valueOrObs)) {
      sources.push(valueOrObs)
      if (binder.live) {
        releases[sources.length - 1] = bind(valueOrObs)
      }
      binder.onUpdate()
    }
  }

  observable.clear = function () {
    releases.forEach(tryInvoke)
    sources.length = 0
    releases.length = 0
    binder.onUpdate()
  }

  observable.delete = function (valueOrObs) {
    var index = sources.indexOf(valueOrObs)
    if (~index) {
      sources.splice(index, 1)
      releases.splice(index, 1).forEach(tryInvoke)
      binder.onUpdate()
    }
  }

  observable.has = function (valueOrObs) {
    return !!~object.indexOf(valueOrObs)
  }

  observable.set = function (values) {
    sources.length = 0
    values.forEach(function (value) {
      sources.push(value)
    })
    binder.onUpdate()
  }

  observable.get = function (index) {
    return sources[index]
  }

  observable.getLength = function () {
    return sources.length
  }

  return observable

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
    var currentValues = object.map(get)
    var newValues = sources.map(resolve)
    currentValues.filter(notIncluded, newValues).forEach(removeFrom, object)
    newValues.filter(notIncluded, currentValues).forEach(addTo, object)
    return true
  }
}

function get (value) {
  return value
}

function resolve (source) {
  return typeof source === 'function' ? source() : source
}

function notIncluded (value) {
  return !~this.indexOf(value)
}

function removeFrom (item) {
  var index = this.indexOf(item)
  if (~index) {
    this.splice(index, 1)
  }
}

function addTo (item) {
  this.push(item)
}

function tryInvoke (func) {
  if (typeof func === 'function') {
    func()
  }
}
