var computed = require('./computed')
var resolve = require('./resolve')
var isObservable = require('./is-observable')

module.exports = Merge

function Merge (sources) {
  var raw = {}
  var value = {}
  var keys = new Set()

  var instance = computed.extended(sources, function update () {
    var currentKeys = []

    forEach(sources, function (source) {
      forEachPair(source, function (key, rawValue) {
        currentKeys.push(key)
        keys.add(key)
        raw[key] = rawValue
        value[key] = resolve(rawValue)
      })
    })

    // remove deleted keys
    Array.from(keys.values()).filter(function (k) {
      return !currentKeys.includes(k)
    }).forEach(function (key) {
      keys.delete(key)
      delete raw[key]
      delete value[key]
    })

    return value
  })

  var result = function MutantMerge (listener) {
    return instance(listener)
  }

  result.keys = function () {
    instance.checkUpdated()
    return Array.from(keys.values())
  }

  result.get = function (key) {
    instance.checkUpdated()
    return raw[key]
  }

  return result
}

function forEach (sources, fn) {
  if (sources && !sources.forEach) {
    sources = resolve(sources)
  }

  if (sources && sources.forEach) {
    sources.forEach(fn)
  }
}

function forEachPair (source, fn) {
  if (source) {
    if (isObservable(source) && source.keys && source.get) {
      resolve(source.keys).forEach(function (key) {
        fn(key, source.get(key))
      })
    }
  }
}
