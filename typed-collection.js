var LazyWatcher = require('./lib/lazy-watcher')
var isSame = require('./lib/is-same')
var resolve = require('./resolve')
var addCollectionMethods = require('./lib/add-collection-methods')

module.exports = TypedCollection

function TypedCollection (ctor, opts) {
  if (typeof ctor !== 'function') throw new Error('Must specify a constructor function')
  opts = opts || {}

  var ctorOpts = opts.ctorOpts
  var matcher = opts.matcher || function (value) { return value && value.id }
  var onAdd = opts.onAdd
  var onRemove = opts.onRemove
  var invalidator = opts.invalidator || function() { return false } 
  var comparer = opts.comparer

  var objectReleases = new Map()
  var mapped = new Map()
  var sources = []
  var object = []
  var releases = []

  var binder = LazyWatcher(update, listen, unlisten)
  binder.value = object

  if (opts.idle) binder.idle = true
  if (opts.nextTick) binder.nextTick = true

  var observable = function MutantTypedCollection (listener) {
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

    onAdd && Array.isArray(result) ? result.forEach(onAdd) : onAdd(result)
    return result
  }

  observable.insert = function (rawObject, index) {
    var source = ctor(rawObject, ctorOpts)
    source.set(rawObject)
    
    var value = resolve(source)
    var key = matcher(value)
    if (mapped.has(key)) throw new Error('The same object key cannot be added more than once.')

    mapped.set(key, source)
    sources.splice(index, 0, source)
    object.splice(index, 0, value)

    if (binder.live) {
      objectReleases.set(source, bind(source))
    }

    binder.broadcast()

    onAdd && onAdd(source)
    return source
  }

  observable.pop = function () {
    var source = sources.pop()
    var key = matcher(object.pop())
    mapped.delete(key)
    triggerRelease(key)
    binder.broadcast()

    onRemove && onRemove(source)
    return source
  }

  observable.shift = function () {
    var source = sources.shift()
    var key = matcher(object.shift())
    mapped.delete(key)
    triggerRelease(key)
    binder.broadcast()

    onRemove && onRemove(source)
    return source
  }

  observable.move = function (source, targetIndex) {
    var currentIndex = observable.indexOf(source)
    if (~currentIndex && currentIndex !== targetIndex) {
      var rawObject = object[currentIndex]
      if (currentIndex < targetIndex) {
        sources.splice(targetIndex + 1, 0, source)
        object.splice(targetIndex + 1, 0, rawObject)
        sources.splice(currentIndex, 1)
        object.splice(currentIndex, 1)
      } else if (currentIndex > targetIndex) {
        sources.splice(targetIndex, 0, source)
        object.splice(targetIndex, 0, rawObject)
        sources.splice(currentIndex + 1, 1)
        object.splice(currentIndex + 1, 1)
      }
      binder.broadcast()
    }
  }

  observable.clear = function () {
    var toRemove = object.slice()
    objectReleases.forEach(tryInvoke)
    objectReleases.clear()
    mapped.clear()
    object.length = 0
    sources.length = 0
    binder.broadcast()
    onRemove && toRemove.forEach(onRemove)
  }

  observable.delete = function (valueOrObs) {
    observable.deleteAt(sources.indexOf(valueOrObs))
  }

  observable.deleteAt = function (index) {
    if (index >= 0 && index < sources.length) {
      var key = matcher(object[index])
      var source = sources[index]
      sources.splice(index, 1)
      object.splice(index, 1)
      mapped.delete(key)
      triggerRelease(key)
      binder.broadcast()
      onRemove && onRemove(source)
    }
  }

  observable.transaction = function (cb) {
    binder.transaction(observable, cb)
  }

  observable.set = function (values) {
    var oldKeys = object.map(matcher)
    var keys = []
    var added = []
    var removed = []

    values.forEach((rawObject, index) => {
      var key = matcher(rawObject)
      if (!mapped.has(key) || invalidator(resolve(mapped.get(key)), rawObject)) {
        if (mapped.has(key)) removed.push(mapped.get(key))
        var source = ctor(rawObject, ctorOpts)
        source.set(rawObject)
        mapped.set(key, source)
        added.push(source)
        if (binder.live) {
          objectReleases.set(source, bind(source))
        }
      } else {
        mapped.get(key).set(rawObject)
      }
      sources[index] = mapped.get(key)
      object[index] = rawObject
      keys[index] = key
    })

    sources.length = values.length
    object.length = values.length
    
    // clean up removed mappings
    oldKeys.forEach(function (key) {
      if (!keys.includes(key)) {
        removed.push(mapped.get(key))
        mapped.delete(key)
        triggerRelease(key)
      }
    })

    binder.broadcast() 

    onAdd && added.forEach(onAdd)
    onRemove && removed.forEach(onRemove)
  }

  return observable

  // scoped

  function triggerRelease (key) {
    tryInvoke(objectReleases.get(key))
    objectReleases.delete(key)
  }

  function add (rawObject) {
    var source = ctor(rawObject, ctorOpts)
    source.set(rawObject)

    var value = resolve(source)
    var key = matcher(value)
    if (mapped.has(key)) throw new Error('The same object key cannot be added more than once')

    mapped.set(key, source)
    sources.push(source)
    object.push(value)

    if (binder.live) {
      objectReleases.set(source, bind(source))
    }

    return source
  }

  function bind (valueOrObs) {
    return typeof valueOrObs === 'function' ? valueOrObs(binder.onUpdate) : null
  }

  function listen () {
    mapped.forEach(function (obs, key) {
      objectReleases.set(key, bind(obs))
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
    objectReleases.clear()

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
