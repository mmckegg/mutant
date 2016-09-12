var computed = require('./computed')
var resolve = require('./resolve')
var forEach = require('./for-each')
var forEachPair = require('./for-each-pair')
var addLookupMethods = require('./lib/add-lookup-methods')

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

  addLookupMethods(result, raw, instance.checkUpdated)

  return result
}
