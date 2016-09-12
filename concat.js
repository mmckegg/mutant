var resolve = require('./resolve')
var addCollectionMethods = require('./lib/add-collection-methods')
var computed = require('./computed')
var forEach = require('./for-each')

module.exports = function Concat (observables) {
  var values = []
  var rawValues = []

  var instance = computed.extended(observables, function () {
    var index = 0

    forEach(observables, function (collection) {
      forEach(collection, function (item) {
        var value = resolve(item)
        values[index] = value
        rawValues[index] = item
        index += 1
      })
    })

    values.length = index
    rawValues.length = index
    return values
  })

  var result = function MutantConcat (listener) {
    return instance(listener)
  }

  // getLength, get, indexOf, etc
  addCollectionMethods(result, rawValues, instance.checkUpdated)

  return result
}
