var resolve = require('./resolve')
var addCollectionMethods = require('./lib/add-collection-methods')
var computed = require('./computed')
var forEach = require('./for-each')

module.exports = function reverse (collection) {
  var values = []
  var rawValues = []

  var instance = computed.extended(collection, function () {
    var index = collection().length
    values.length = index
    rawValues.length = index

    forEach(collection, function (item) {
      index -= 1
      var value = resolve(item)
      values[index] = value
      rawValues[index] = item
    })

    return values
  })

  var result = function MutantReverse (listener) {
    return instance(listener)
  }

  // getLength, get, indexOf, etc
  addCollectionMethods(result, rawValues, instance.checkUpdated)

  return result
}
