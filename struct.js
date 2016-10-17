var Value = require('./value')
var LazyWatcher = require('./lib/lazy-watcher')
var isSame = require('./lib/is-same')

module.exports = Struct

var blackList = {
  'length': 'Clashes with `Function.prototype.length`.\n',
  'name': 'Clashes with `Function.prototype.name`\n',
  'destroy': '`destroy` is a reserved key of struct\n'
}

function Struct (properties, opts) {
  var object = Object.create({})
  var releases = []
  var binder = LazyWatcher(update, listen, unlisten)
  binder.value = object

  if (opts && opts.nextTick) {
    binder.nextTick = true
  }

  var comparer = opts && opts.comparer || null

  var observable = function MutantStruct (listener) {
    if (!listener) {
      return binder.getValue()
    }
    return binder.addListener(listener)
  }

  var keys = Object.keys(properties)
  var suspendBroadcast = false

  keys.forEach(function (key) {
    if (blackList.hasOwnProperty(key)) {
      throw new Error("Cannot create a struct with a key named '" + key + "'.\n" + blackList[key])
    }

    var obs = typeof properties[key] === 'function'
      ? properties[key]
      : Value(properties[key])

    object[key] = obs()
    observable[key] = obs
  })

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
      binder.broadcast()
    }
  }

  return observable

  // scoped

  function listen () {
    keys.map(function (key) {
      var obs = observable[key]
      releases.push(obs(function (val) {
        if (!isSame(val, object[key], comparer)) {
          object[key] = val
          if (!suspendBroadcast) {
            binder.broadcast(object)
          }
        }
      }))
    })
  }

  function unlisten () {
    while (releases.length) {
      releases.pop()()
    }
  }

  function update () {
    var changed = false
    keys.forEach(function (key) {
      var newValue = observable[key]()
      if (!isSame(newValue, object[key], comparer)) {
        object[key] = observable[key]()
        changed = true
      }
    })
    return changed
  }
}
