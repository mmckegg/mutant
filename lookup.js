var MutantMap = require('./map')
var computed = require('./computed')
var resolve = require('./resolve')
var KeyValue = require('./lib/key-value')
var isObservable = require('./is-observable')

module.exports = Lookup

function Lookup (obs, lambdaOrKey, opts) {
  var mapped = MutantMap(obs, function (item, invalidateOn) {
    if (typeof lambdaOrKey === 'function') {
      var value = lambdaOrKey(item, invalidateOn)
      if (isObservable(value) && value._type === 'MutantKeyValue') {
        return value // passthru
      } else if (Array.isArray(value)) {
        return KeyValue(value[0], value[1])
      } else {
        return KeyValue(value, item)
      }
    } else if (typeof lambdaOrKey === 'string') {
      return KeyValue(item[lambdaOrKey], item)
    }
  })

  var raw = {}
  var value = {}
  var keys = new Set()

  var instance = computed.extended(mapped, function update () {
    var currentKeys = []

    for (var i = 0; i < mapped.getLength(); i++) {
      var item = mapped.get(i)
      if (item) {
        var key = resolve(item.key)
        if (key != null) {
          var rawValue = item.value
          currentKeys.push(key)
          keys.add(key)
          raw[key] = rawValue
          value[key] = resolve(rawValue)
        }
      }
    }

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

  var result = function MutantLookup (listener) {
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
