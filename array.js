var Value = require('./value')
var LazyWatcher = require('./lib/lazy-watcher')
var isSame = require('./lib/is-same')
var isObservable = require('./is-observable')
var resolve = require('./resolve')
var addCollectionMethods = require('./lib/add-collection-methods')
var forEach = require('./for-each')

module.exports = Array

function Array (defaultValues, opts) {
  var object = []
  var sources = []
  var objectReleases = []
  var fixedIndexing = opts && opts.fixedIndexing || false

  var releases = []
  var comparer = opts && opts.comparer || null

  var binder = LazyWatcher(update, listen, unlisten)
  binder.value = object

  if (opts && opts.idle) binder.idle = true
  if (opts && opts.nextTick) binder.nextTick = true

  if (defaultValues && defaultValues.length) {
    forEach(defaultValues, add)
  }

  var observable = function MutantArray (listener) {
    if (!listener) {
      return binder.getValue()
    }
    return binder.addListener(listener)
  }

  // getLength, get, indexOf, etc
  addCollectionMethods(observable, sources)

  observable.push = function (item) {
    var result = null
    if (arguments.length === 1) {
      result = add(item)
    } else {
      result = []
      for (var i = 0; i < arguments.length; i++) {
        result.push(add(arguments[i]))
      }
    }
    binder.broadcast()
    return result
  }

  observable.put = function (index, valueOrObs) {
    valueOrObs = getObsValue(valueOrObs)
    sources[index] = valueOrObs
    object[index] = resolve(valueOrObs)
    if (binder.live) {
      tryInvoke(objectReleases[index])
      objectReleases[index] = bind(valueOrObs)
    }
    binder.broadcast()
    return valueOrObs
  }

  observable.insert = function (valueOrObs, at) {
    valueOrObs = getObsValue(valueOrObs)
    sources.splice(at, 0, valueOrObs)
    if (binder.live) objectReleases.splice(at, 0, bind(valueOrObs))
    object.splice(at, 0, resolve(valueOrObs))
    binder.broadcast()
    return valueOrObs
  }

  observable.pop = function () {
    var result = sources.pop()
    if (binder.live) tryInvoke(objectReleases.pop())
    object.pop()
    binder.broadcast()
    return result
  }

  observable.shift = function () {
    var result = sources.shift()
    if (binder.live) tryInvoke(objectReleases.shift())
    object.shift()
    binder.broadcast()
    return result
  }

  observable.clear = function () {
    objectReleases.forEach(tryInvoke)
    sources.length = 0
    objectReleases.length = 0
    object.length = 0
    binder.broadcast()
  }

  observable.delete = function (valueOrObs) {
    observable.deleteAt(sources.indexOf(valueOrObs))
  }

  observable.deleteAt = function (index) {
    if (index >= 0 && index < sources.length) {
      sources.splice(index, 1)
      if (binder.live) objectReleases.splice(index, 1).forEach(tryInvoke)
      object.splice(index, 1)
      binder.broadcast()
    }
  }

  observable.transaction = function (cb) {
    binder.transaction(observable, cb)
  }

  observable.set = function (values) {
    var changed = false
    if (fixedIndexing) {
      var length = values && values.length || 0
      for (var i = 0; i < length; i++) {
        if (isObservable(values[i])) {
          if (values[i] !== sources[i]) {
            tryInvoke(objectReleases[index])
            sources[i] = values[i]
            changed = true
            if (binder.live) {
              objectReleases[i] = bind(sources[i])
            }
          }
        } else if (sources[i] && sources[i]._type === 'MutantArrayValue') {
          if (!isSame(sources[i](), values[i], comparer)) {
            sources[i].set(values[i])
            changed = true
          }
        } else {
          tryInvoke(objectReleases[index])
          sources[i] = getObsValue(values[i])
          changed = true
          if (binder.live) {
            objectReleases[i] = bind(sources[i])
          }
        }
      }
      for (var index = length; index < sources.length; index++) {
        tryInvoke(objectReleases[index])
        changed = true
      }

      if (changed) {
        objectReleases.length = length
        sources.length = length
        object.length = length
        binder.broadcast()
      }
    } else {
      unlisten()
      sources.length = 0
      objectReleases.length = 0
      object.length = 0
      forEach(values, add)
      if (binder.live) {
        listen()
        binder.broadcast()
      }
    }
  }

  return observable

  // scoped

  function getObsValue (valueOrObs) {
    if (fixedIndexing && !isObservable(valueOrObs)) {
      valueOrObs = Value(valueOrObs)
      valueOrObs._type = 'MutantArrayValue'
    }
    return valueOrObs
  }

  function add (valueOrObs) {
    valueOrObs = getObsValue(valueOrObs)
    sources.push(valueOrObs)
    object.push(resolve(valueOrObs))
    if (binder.live) {
      objectReleases.push(bind(valueOrObs))
    }
    return valueOrObs
  }

  function bind (valueOrObs) {
    return typeof valueOrObs === 'function' ? valueOrObs(binder.onUpdate) : null
  }

  function listen () {
    sources.forEach(function (obs, i) {
      objectReleases[i] = bind(obs)
    })

    if (opts && opts.onListen) {
      var release = opts.onListen()
      if (typeof release === 'function') {
        releases.push(release)
      }
    }
  }

  function unlisten () {
    objectReleases.forEach(tryInvoke)
    objectReleases.length = 0

    while (releases.length) {
      tryInvoke(releases.pop())
    }

    if (opts && opts.onUnlisten) {
      opts.onUnlisten()
    }
  }

  function update () {
    var changed = false
    sources.forEach(function (source, i) {
      var newValue = resolve(source)
      if (!isSame(newValue, object[i], comparer)) {
        object[i] = newValue
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
