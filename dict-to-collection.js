var addCollectionMethods = require('./lib/add-collection-methods')
var computed = require('./computed')
var KeyValue = require('./lib/key-value')
var resolve = require('./resolve')
var isObservable = require('./is-observable')
var MutantMap = require('./map')

module.exports = DictToCollection

function DictToCollection (obs) {
  var value = []
  var raw = []

  var instance = computed.extended(obs, function () {
    var keys = getKeys(obs)
    var length = keys.length

    for (var i = 0; i < length; i++) {
      var key = keys[i]
      var item = getValue(obs, key)
      if (shouldUpdate(item, raw[i])) {
        if (raw[i].key() !== key) {
          raw[i].key.set(key)
        }
        if (raw[i].value !== item) {
          raw[i].value.set(item)
        }
      } else {
        raw[i] = KeyValue(key, item)
      }
      value[i] = resolve(raw[i])
    }

    raw.length = value.length = length
    return value
  })

  var result = function MutantDictToCollection (listener) {
    return instance(listener)
  }

  // getLength, get, indexOf, etc
  addCollectionMethods(result, raw, instance.checkUpdated)

  return result
}

module.exports.values = function (obs) {
  return MutantMap(DictToCollection(obs), function (item) {
    return item.value
  })
}

function shouldUpdate (newItem, keyValue) {
  if (!keyValue) {
    return false
  } else if (isObservable(newItem) && keyValue.value === newItem) {
    return true
  } else {
    return !keyValue.isBound
  }
}

function getKeys (value) {
  if (isObservable(value) && value.keys) {
    return resolve(value.keys)
  } else {
    return Object.keys(resolve(value))
  }
}

function getValue (obj, key) {
  if (isObservable(obj) && obj.get) {
    return obj.get(key)
  } else {
    var resolved = resolve(obj)
    if (resolved) {
      return resolved[key]
    }
  }
}
