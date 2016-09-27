var resolve = require('./resolve')
var LazyWatcher = require('./lib/lazy-watcher')
var isSame = require('./lib/is-same')
var addCollectionMethods = require('./lib/add-collection-methods')

module.exports = Map

function Map (obs, lambda, opts) {
  // opts: comparer, maxTime, onRemove

  var comparer = opts && opts.comparer || null
  var releases = []
  var binder = LazyWatcher(update, listen, unlisten)

  var itemInvalidators = new global.Map()
  var lastValues = new global.Map()
  var rawSet = new global.Set()

  var items = []

  var raw = []
  var values = []
  var watches = []

  binder.value = values

  // incremental update
  var queue = []
  var maxTime = null
  if (opts && opts.maxTime) {
    maxTime = opts.maxTime
  }

  var result = function MutantMap (listener) {
    if (!listener) {
      return binder.getValue()
    }
    return binder.addListener(listener)
  }

  addCollectionMethods(result, raw, binder.checkUpdated)

  return result

  // scoped

  function listen () {
    if (typeof obs === 'function') {
      releases.push(obs(binder.onUpdate))
    }
    rebindAll()

    Array.from(itemInvalidators.values()).forEach(function (invalidators) {
      invalidators.forEach(function (invalidator) {
        invalidator.release = invalidator.observable(invalidate.bind(null, invalidator))
      })
    })

    if (opts && opts.onListen) {
      var release = opts.onListen()
      if (typeof release === 'function') {
        releases.push(release)
      }
    }
  }

  function unlisten () {
    while (releases.length) {
      releases.pop()()
    }
    rebindAll()

    Array.from(itemInvalidators.values()).forEach(function (invalidators) {
      invalidators.forEach(invokeRelease)
    })

    if (opts && opts.onUnlisten) {
      opts.onUnlisten()
    }
  }

  function update () {
    var changed = false

    if (items.length !== getLength(obs)) {
      changed = true
    }

    var startedAt = Date.now()

    for (var i = 0, len = getLength(obs); i < len; i++) {
      var item = get(obs, i)
      var currentItem = items[i]
      items[i] = item

      if (!isSame(item, currentItem, comparer) || (!binder.live && checkInvalidated(item))) {
        if (maxTime && Date.now() - startedAt > maxTime) {
          queueUpdateItem(i)
        } else {
          updateItem(i)
        }
        changed = true
      }
    }

    if (changed) {
      // clean up cache
      var oldLength = raw.length
      var newLength = getLength(obs)
      Array.from(lastValues.keys()).filter(notIncluded, obs).forEach(removeItem)
      items.length = newLength
      values.length = newLength
      raw.length = newLength
      for (var index = newLength; index < oldLength; index++) {
        rebind(index)
      }
      Array.from(rawSet.values()).filter(notIncluded, raw).forEach(removeMapped)
    }

    return changed
  }

  function checkInvalidated (item) {
    if (itemInvalidators.has(item)) {
      return itemInvalidators.get(item).some(function (invalidator) {
        lastValues.delete(invalidator.item)
        return !isSame(invalidator.currentValue, resolve(invalidator.observable), comparer)
      })
    }
  }

  function queueUpdateItem (i) {
    if (!queue.length) {
      setImmediate(flushQueue)
    }
    if (!~queue.indexOf(i)) {
      queue.push(i)
    }
  }

  function flushQueue () {
    var startedAt = Date.now()
    while (queue.length && (!maxTime || Date.now() - startedAt < maxTime)) {
      updateItem(queue.pop())
    }
    binder.broadcast()
    if (queue.length) {
      setImmediate(flushQueue)
    }
  }

  function invalidateOn (item, obs) {
    if (!itemInvalidators.has(item)) {
      itemInvalidators.set(item, [])
    }

    var invalidators = itemInvalidators.get(item)
    var invalidator = {
      currentValue: resolve(obs),
      observable: obs,
      item: item,
      release: null
    }

    invalidators.push(invalidator)

    if (binder.live) {
      invalidator.release = invalidator.observable(invalidate.bind(null, invalidator))
    }
  }

  function addInvalidateCallback (item) {
    return invalidateOn.bind(null, item)
  }

  function removeItem (item) {
    lastValues.delete(item)
    if (itemInvalidators.has(item)) {
      itemInvalidators.get(item).forEach(invokeRelease)
      itemInvalidators.delete(item)
    }
  }

  function removeMapped (mappedItem) {
    rawSet.delete(mappedItem)
    if (opts && opts.onRemove) {
      opts.onRemove(mappedItem)
    }
  }

  function invalidate (entry) {
    var changed = false
    var length = getLength(obs)
    lastValues.delete(entry.item)
    for (var i = 0; i < length; i++) {
      if (get(obs, i) === entry.item) {
        updateItem(i)
        changed = true
      }
    }
    if (changed) {
      binder.broadcast()
    }
  }

  function updateItem (i) {
    var item = get(obs, i)
    if (!lastValues.has(item) || !isSame(item, item, comparer)) {
      if (itemInvalidators.has(item)) {
        itemInvalidators.get(item).forEach(invokeRelease)
        itemInvalidators.delete(item)
      }
      var newValue = lambda(item, addInvalidateCallback(item))
      if (newValue !== raw[i]) {
        raw[i] = newValue
      }
      rawSet.add(newValue)
      lastValues.set(item, raw[i])
      rebind(i)
    } else {
      raw[i] = lastValues.get(item)
    }
    values[i] = resolve(raw[i])
  }

  function rebind (index) {
    if (watches[index]) {
      watches[index]()
      watches[index] = null
    }

    if (binder.live) {
      if (typeof raw[index] === 'function') {
        watches[index] = updateValue(raw[index], index)
      }
    }
  }

  function rebindAll () {
    for (var i = 0; i < raw.length; i++) {
      rebind(i)
    }
  }

  function updateValue (obs, index) {
    return obs(function (value) {
      if (!isSame(values[index], value, comparer)) {
        values[index] = value
        binder.broadcast()
      }
    })
  }
}

function get (target, index) {
  if (typeof target === 'function' && !target.get) {
    target = target()
  }

  if (Array.isArray(target)) {
    return target[index]
  } else if (target && target.get) {
    return target.get(index)
  }
}

function getLength (target) {
  if (typeof target === 'function' && !target.getLength) {
    target = target()
  }

  if (Array.isArray(target)) {
    return target.length
  } else if (target && target.get) {
    return target.getLength()
  }

  return 0
}

function notIncluded (value) {
  if (this.includes) {
    return !this.includes(value)
  } else if (this.indexOf) {
    return !~this.indexOf(value)
  } else if (typeof this === 'function') {
    var array = this()
    if (array && array.includes) {
      return !array.includes(value)
    }
  }
  return true
}

function deleteEntry (entry) {
  this.delete(entry)
}

function invokeRelease (item) {
  if (item.release) {
    item.release()
    item.release = null
  }
}
