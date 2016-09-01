var Value = require('./value')

module.exports = Struct

var blackList = {
  'length': 'Clashes with `Function.prototype.length`.\n',
  'name': 'Clashes with `Function.prototype.name`\n',
  'destroy': '`destroy` is a reserved key of struct\n'
}

function Struct (properties) {
  var object = Object.create({})
  var observable = Value(object)
  var broadcast = observable.set
  var keys = Object.keys(properties)
  var suspendBroadcast = false

  var releases = keys.map(function (key) {
    if (blackList.hasOwnProperty(key)) {
      throw new Error("Cannot create a struct with a key named '" + key + "'.\n" + blackList[key])
    }

    var obs = typeof properties[key] === 'function'
      ? properties[key]
      : Value(properties[key])

    object[key] = obs()
    observable[key] = obs

    return obs(function (val) {
      object[key] = val
      if (!suspendBroadcast) {
        broadcast(object)
      }
    })
  })

  observable.destroy = function () {
    while (releases.length) {
      releases.pop()()
    }
  }

  observable.set = function (values) {
    var lastValue = suspendBroadcast
    suspendBroadcast = true
    values = values || {}

    // update inner observables
    keys.forEach(function (key) {
      if (observable[key]() !== values[key]) {
        observable[key].set(values[key])
      }
    })

    // store additional keys (but don't create observables)
    Object.keys(values).forEach(function (key) {
      if (!(key in properties)) {
        object[key] = values[key]
      }
    })

    suspendBroadcast = lastValue
    if (!suspendBroadcast) {
      broadcast(object)
    }
  }

  return observable
}
