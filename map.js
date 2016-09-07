var resolve = require('./resolve')
var LazyWatcher = require('./lib/lazy-watcher')

module.exports = Map

function Map (obs, lambda, opts) {
  var releases = []
  var binder = LazyWatcher(update, listen, unlisten)

  var lastValues = new global.Map()
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

  result.get = function (index) {
    return raw[index]
  }

  result.getLength = function (index) {
    return raw.length
  }

  result.includes = function (valueOrObs) {
    return !!~raw.indexOf(valueOrObs)
  }

  result.indexOf = function (valueOrObs) {
    return raw.indexOf(valueOrObs)
  }

  return result

  // scoped

  function listen () {
    if (typeof obs === 'function') {
      releases.push(obs(binder.onUpdate))
    }
    rebindAll()
  }

  function unlisten () {
    while (releases.length) {
      releases.pop()()
    }
    rebindAll()
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

      if (typeof item === 'object' || item !== currentItem) {
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
      Array.from(lastValues.keys()).filter(notIncluded, obs).forEach(deleteEntry, lastValues)
      items.length = getLength(obs)
      values.length = items.length
      for (var index = items.length; index < raw.length; index++) {
        rebind(index)
      }
    }

    return changed
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

  function updateItem (i) {
    var item = get(obs, i)
    if (typeof item === 'object') {
      raw[i] = lambda(item)
    } else {
      if (!lastValues.has(item)) {
        lastValues.set(item, lambda(item))
      }
      raw[i] = lastValues.get(item)
    }
    values[i] = resolve(raw[i])
    rebind(i)
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
      if (values[index] !== value || typeof value === 'object') {
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
