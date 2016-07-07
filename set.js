var Value = require('./value')

module.exports = Set

function Set (defaultValues) {
  var object = []
  var sources = []
  var releases = []

  if (defaultValues && defaultValues.length) {
    defaultValues.forEach(function (valueOrObs) {
      if (!~sources.indexOf(valueOrObs)) {
        sources.push(valueOrObs)
        releases[sources.length - 1] = typeof valueOrObs === 'function'
          ? valueOrObs(refresh)
          : null
      }
    })
    update()
  }

  var observable = Value(object)
  var broadcast = observable.set

  observable.add = function (valueOrObs) {
    if (!~sources.indexOf(valueOrObs)) {
      sources.push(valueOrObs)
      releases[sources.length - 1] = typeof valueOrObs === 'function'
        ? valueOrObs(refresh)
        : null
      refresh()
    }
  }

  observable.clear = function () {
    releases.forEach(tryInvoke)
    sources.length = 0
    releases.length = 0
    refresh()
  }

  observable.delete = function (valueOrObs) {
    var index = sources.indexOf(valueOrObs)
    if (~index) {
      sources.splice(index, 1)
      releases.splice(index, 1).forEach(tryInvoke)
      refresh()
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
    refresh()
  }

  observable.destroy = observable.clear

  return observable

  function refresh () {
    update()
    broadcast(object)
  }

  function update () {
    var currentValues = object.map(get)
    var newValues = sources.map(resolve)
    currentValues.filter(notIncluded, newValues).forEach(removeFrom, object)
    newValues.filter(notIncluded, currentValues).forEach(addTo, object)
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
