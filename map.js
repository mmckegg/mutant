var resolve = require('./resolve')
var computed = require('./computed')

module.exports = Map

function Map (obs, lambda) {
  var releases = []
  var live = false
  var lazy = false
  var listeners = []

  var lastValues = new global.Map()
  var items = []

  var raw = []
  var values = []
  var watches = []

  var result = function MutantMap (listener) {
    if (!listener) {
      return getValue()
    }

    if (typeof listener !== 'function') {
      throw new Error('Listeners must be functions.')
    }

    listeners.push(listener)
    listen()

    return function remove () {
      for (var i = 0, len = listeners.length; i < len; i++) {
        if (listeners[i] === listener) {
          listeners.splice(i, 1)
          break
        }
      }
      if (!listeners.length) {
        unlisten()
      }
    }
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
    if (!live) {
      live = true
      lazy = true
      if (typeof obs === 'function') {
        releases.push(obs(onUpdate))
      }
      rebindAll()
    }
  }

  function unlisten () {
    if (live) {
      live = false
      while (releases.length) {
        releases.pop()()
      }
      rebindAll()
    }
  }

  function onUpdate () {
    if (update()) {
      broadcast()
    }
  }

  function update () {
    var changed = false

    if (items.length !== getLength(obs)) {
      changed = true
    }

    for (var i = 0, len = getLength(obs); i < len; i++) {
      var item = get(obs, i)

      if (typeof item === 'object') {
        items[i] = item
        raw[i] = lambda(item)
        values[i] = resolve(raw[i])
        changed = true
        rebind(i)
      } else if (item !== items[i]) {
        items[i] = item
        if (!lastValues.has(item)) {
          lastValues.set(item, lambda(item))
        }
        raw[i] = lastValues.get(item)
        values[i] = resolve(raw[i])
        changed = true
        rebind(i)
      }
    }

    if (changed) {
      // clean up cache
      Array.from(lastValues.keys()).filter(notIncluded, obs).forEach(deleteEntry, lastValues)
      items.length = getLength(obs)
      values.length = items.length
    }

    return changed
  }

  function rebind (index) {
    if (watches[index]) {
      watches[index]()
      watches[index] = null
    }

    if (live) {
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
        broadcast()
      }
    })
  }

  function broadcast () {
    for (var i = 0, len = listeners.length; i < len; i++) {
      listeners[i](values)
    }
  }

  function getValue () {
    if (!live || lazy) {
      lazy = false
      update()
    }
    return values
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
