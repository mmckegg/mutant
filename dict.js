var Value = require('./value')
var LazyWatcher = require('./lib/lazy-watcher')
var isSame = require('./lib/is-same')
var resolve = require('./resolve')
var isObservable = require('./is-observable')
var forEachPair = require('./for-each-pair')
var addLookupMethods = require('./lib/add-lookup-methods')

module.exports = Dict

function Dict (defaultValues, opts) {
  var object = Object.create({})
  var sources = {}
  var releases = {}
  var fixedIndexing = opts && opts.fixedIndexing || false

  var comparer = opts && opts.comparer || null

  var binder = LazyWatcher(update, listen, unlisten)
  binder.value = object

  if (opts && opts.nextTick) binder.nextTick = true
  if (opts && opts.idle) binder.idle = true

  if (defaultValues) {
    forEachPair(defaultValues, put)
  }

  var observable = function MutantDictionary (listener) {
    if (!listener) {
      return binder.getValue()
    }
    return binder.addListener(listener)
  }

  addLookupMethods(observable, sources)

  observable.put = function (key, valueOrObs) {
    valueOrObs = getObsValue(valueOrObs)
    put(key, valueOrObs)
    binder.broadcast()
    return valueOrObs
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
    if (fixedIndexing) {
      var keys = []

      forEachPair(values, function (key, value) {
        keys.push(key)
        if (sources[key]) {
          sources[key].set(value)
        } else {
          put(key, getObsValue(value))
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

      forEachPair(values, put)
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
      releases[key] = null
    })

    if (opts && opts.onListen) {
      var release = opts.onListen()
      if (typeof release === 'function') {
        // isn't releases an object? how are you pushing into it?
        releases.push(release)
      }
    }
  }

  function unlisten () {
    Object.keys(sources).forEach(function (key) {
      tryInvoke(releases[key])
      delete releases[key]
    })

    if (opts && opts.onUnlisten) {
      opts.onUnlisten()
    }
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
