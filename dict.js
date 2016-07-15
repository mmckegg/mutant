var Value = require('./value')

module.exports = Dict

function Dict (defaultValues) {
  var object = Object.create({})
  var sources = []
  var releases = []

  if (defaultValues) {
    Object.keys(defaultValues).forEach(function (key) {
      put(key, defaultValues[key])
    })
  }

  var observable = Value(object)
  var broadcast = observable.set

  observable.put = function (key, valueOrObs) {
    put(key, valueOrObs)
    broadcast(object)
  }

  observable.get = function (key) {
    return sources[key]
  }

  observable.keys = function () {
    return Object.keys(sources)
  }

  observable.clear = function () {
    Object.keys(sources).forEach(function (key) {
      tryInvoke(releases[key])
      delete sources[key]
      delete releases[key]
      delete object[key]
    })
    broadcast(object)
  }

  observable.delete = function (key) {
    tryInvoke(releases[key])
    delete sources[key]
    delete releases[key]
    delete object[key]
    broadcast(object)
  }

  observable.includes = function (valueOrObs) {
    return !!~object.indexOf(valueOrObs)
  }

  observable.set = function (values) {
    Object.keys(sources).forEach(function (key) {
      tryInvoke(releases[key])
      delete sources[key]
      delete releases[key]
      delete object[key]
    })

    Object.keys(values).forEach(function (key) {
      put(key, values[key])
    })

    broadcast(object)
  }

  observable.destroy = observable.clear

  return observable

  // scoped

  function put (key, valueOrObs) {
    tryInvoke(releases[key])
    sources[key] = valueOrObs
    releases[key] = bind(key, valueOrObs)
    object[key] = resolve(valueOrObs)
  }

  function bind (key, valueOrObs) {
    return typeof valueOrObs === 'function' ? valueOrObs(update.bind(this, key)) : null
  }

  function update (key, value) {
    object[key] = value
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
