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
  var keys = []

  var instance = computed.extended(obs, function () {
    var newKeys = getKeys(obs)
    var remove = keys.filter((key) => !newKeys.includes(key))
    var add = newKeys.filter((key) => !keys.includes(key))
    var update = keys.filter((key) => keys.includes(key))

    remove.forEach((key) => {
      var index = keys.indexOf(key)
      if (~index) {
        keys.splice(index, 1)
        raw.splice(index, 1)
        value.splice(index, 1)
      }
    })

    add.forEach((key) => {
      var item = getValue(obs, key)
      var rawValue = KeyValue(key, item)
      keys.push(key)
      raw.push(rawValue)
      value.push(resolve(rawValue))
    })

    update.forEach((key) => {
      var index = keys.indexOf(key)
      if (~index) {
        var item = getValue(obs, key)
        if (raw[index].isBound || isObservable(item)) {
          if (raw[index].value !== item) {
            raw[index] = KeyValue(key, item)
          }
        } else {
          raw[index].value.set(item)
        }
        value[index] = resolve(raw[index])
      }
    })

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
