var Value = require('./value')

module.exports = Array

function Array (defaultValues) {
  var object = []
  var sources = []
  var releases = []

  if (defaultValues && defaultValues.length) {
    defaultValues.forEach(add)
  }

  var observable = Value(object)
  var broadcast = observable.set

  observable.push = function (args) {
    for (var i = 0; i < arguments.length; i++) {
      add(arguments[i])
    }
    broadcast(object)
  }

  observable.insert = function (valueOrObs, at) {
    sources.splice(at, 0, valueOrObs)
    releases.splice(at, 0, bind(valueOrObs))
    object.splice(at, 0, resolve(valueOrObs))
    broadcast(object)
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
    tryInvoke(releases.pop())
    object.pop()
    broadcast(object)
    return result
  }

  observable.shift = function () {
    var result = sources.shift()
    tryInvoke(releases.shift())
    object.shift()
    broadcast(object)
    return result
  }

  observable.clear = function () {
    releases.forEach(tryInvoke)
    sources.length = 0
    releases.length = 0
    object.length = 0
    broadcast(object)
  }

  observable.delete = function (valueOrObs) {
    var index = sources.indexOf(valueOrObs)
    if (~index) {
      sources.splice(index, 1)
      releases.splice(index, 1).forEach(tryInvoke)
      object.splice(index, 1)
      broadcast(object)
    }
  }

  observable.set = function (values) {
    releases.forEach(tryInvoke)
    sources.length = 0
    releases.length = 0
    object.length = 0
    values.forEach(add)
    broadcast(object)
  }

  observable.destroy = observable.clear

  return observable

  // scoped

  function add (valueOrObs) {
    sources.push(valueOrObs)
    releases.push(bind(valueOrObs))
    object.push(resolve(valueOrObs))
  }

  function bind (valueOrObs) {
    return typeof valueOrObs === 'function' ? valueOrObs(update.bind(this, valueOrObs)) : null
  }

  function update (obs, value) {
    sources.forEach(function (source, i) {
      if (source === obs) {
        object[i] = value
      }
    })
    broadcast(object)
  }
}

function resolve (source) {
  return typeof source === 'function' ? source() : source
}

function tryInvoke (func) {
  if (typeof func === 'function') {
    func()
  }
}
