var Value = require('./value')
var LazyWatcher = require('./lib/lazy-watcher')
var isSame = require('./lib/is-same')
var extend = require('xtend')

module.exports = Struct

var blackList = {
  'length': 'Clashes with `Function.prototype.length`.\n',
  'name': 'Clashes with `Function.prototype.name`\n',
  'set': '`set` is a reserved key of struct\n'
}

function Struct (properties, opts) {
  var state = {
    object: Object.create({}),
    comparer: (opts && opts.comparer) || null,
    suspendBroadcast: false,
    releases: [],
    keys: Object.keys(properties),
    properties: properties
  }

  if (opts && opts.nextTick) state.binder.nextTick = true
  if (opts && opts.idle) state.binder.idle = true

  state.observable = MutantStruct.bind(state)
  state.observable.set = set.bind(state)

  state.keys.forEach(function (key) {
    if (blackList.hasOwnProperty(key)) {
      throw new Error("Cannot create a struct with a key named '" + key + "'.\n" + blackList[key])
    }

    var obs = typeof properties[key] === 'function'
      ? properties[key]
      : Value(properties[key])

    state.object[key] = obs()
    state.observable[key] = obs
  })

  state.binder = LazyWatcher(update, listen, unlisten, state)
  state.binder.value = state.object

  return state.observable
}

function MutantStruct (listener) {
  if (!listener) {
    return this.binder.getValue()
  }
  return this.binder.addListener(listener)
}

function set (values, opts) {
  var lastValue = this.suspendBroadcast

  this.suspendBroadcast = true
  values = values || {}

  if (opts && opts.merge) {
    values = extend(this.object, values)
  }

  // update inner observables
  this.keys.forEach(function (key) {
    if (this.observable[key]() !== values[key]) {
      this.observable[key].set(values[key])
    }
  }, this)

  // store additional keys (but don't create observables)
  Object.keys(values).forEach(function (key) {
    if (!(key in this.properties)) {
      this.object[key] = values[key]
    }
  }, this)

  this.suspendBroadcast = lastValue
  if (!this.suspendBroadcast) {
    this.binder.broadcast()
  }
}

function update () {
  var changed = false
  this.keys.forEach(function (key) {
    var newValue = this.observable[key]()
    if (!isSame(newValue, this.object[key], this.comparer)) {
      this.object[key] = this.observable[key]()
      changed = true
    }
  }, this)
  return changed
}

function listen () {
  this.keys.forEach(function (key) {
    var obs = this.observable[key]
    this.releases.push(obs(listener.bind(this, key)))
  }, this)
}

function listener (key, val) {
  if (!isSame(val, this.object[key], this.comparer)) {
    this.object[key] = val
    if (!this.suspendBroadcast) {
      this.binder.broadcast(this.object)
    }
  }
}

function unlisten () {
  while (this.releases.length) {
    this.releases.pop()()
  }
}
