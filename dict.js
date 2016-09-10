var Value = require('./value')
var LazyWatcher = require('./lib/lazy-watcher')
var isSame = require('./lib/is-same')
var resolve = require('./resolve')
var isObservable = require('./is-observable')

// TODO: reimplement using LazyWatcher

module.exports = Dict

function Dict (defaultValues, opts) {
  var object = Object.create({})
  var sources = []
  var releases = []
  var fixedIndexing = opts && opts.fixedIndexing || false

  var comparer = opts && opts.comparer || null

  var binder = LazyWatcher(update, listen, unlisten)
  binder.value = object

  if (defaultValues) {
    Object.keys(defaultValues).forEach(function (key) {
      put(key, defaultValues[key])
    })
  }

  var observable = function MutantDictionary (listener) {
    if (!listener) {
      return binder.getValue()
    }
    return binder.addListener(listener)
  }

  observable.put = function (key, valueOrObs) {
    valueOrObs = getObsValue(valueOrObs)
    put(key, valueOrObs)
    binder.broadcast()
    return valueOrObs
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
    binder.broadcast()
  }

  observable.delete = function (key) {
    tryInvoke(releases[key])
    delete sources[key]
    delete releases[key]
    delete object[key]
    binder.broadcast()
  }

  observable.includes = function (valueOrObs) {
    return !!~object.indexOf(valueOrObs)
  }

  observable.set = function (values) {
    var keys = values && Object.keys(values) || []
    if (fixedIndexing) {
      keys.forEach(function (key) {
        if (sources[key]) {
          sources[key].set(values[key])
        } else {
          put(key, getObsValue(values[key]))
        }
      })

      Object.keys(sources).forEach(function (key) {
        if (!keys.includes(key)) {
          tryInvoke(releases[key])
          delete sources[key]
          delete releases[key]
          delete object[key]
        }
      })
    } else {
      Object.keys(sources).forEach(function (key) {
        tryInvoke(releases[key])
        delete sources[key]
        delete releases[key]
        delete object[key]
      })

      keys.forEach(function (key) {
        put(key, values[key])
      })

      binder.broadcast()
    }
  }

  return observable

  // scoped

  function getObsValue (valueOrObs) {
    if (fixedIndexing && !isObservable(valueOrObs)) {
      valueOrObs = Value(valueOrObs)
    }
    return valueOrObs
  }

  function put (key, valueOrObs) {
    tryInvoke(releases[key])
    sources[key] = valueOrObs
    if (binder.live) {
      releases[key] = bind(key, valueOrObs)
    }
    object[key] = resolve(valueOrObs)
  }

  function bind (key, valueOrObs) {
    return typeof valueOrObs === 'function' ? valueOrObs(updateKey.bind(this, key)) : null
  }

  function updateKey (key, value) {
    object[key] = value
    binder.broadcast()
  }

  function listen () {
    Object.keys(sources).forEach(function (key) {
      releases[key] = bind(sources[key])
    })
  }

  function unlisten () {
    Object.keys(sources).forEach(function (key) {
      tryInvoke(releases[key])
      delete releases[key]
    })
  }

  function update () {
    var changed = false
    Object.keys(sources).forEach(function (key) {
      var newValue = resolve(sources[key])
      if (!isSame(newValue, object[key], comparer)) {
        object[key] = newValue
        changed = true
      }
    })
    return changed
  }
}

function tryInvoke (func) {
  if (typeof func === 'function') {
    func()
  }
}
