var LazyWatcher = require('./lib/lazy-watcher')

module.exports = Set

function Set (defaultValues, opts) {
  var instance = new ProtoSet(defaultValues, opts)
  var observable = instance.MutantSet.bind(instance)
  observable.add = instance.add.bind(instance)
  observable.clear = instance.clear.bind(instance)
  observable.delete = instance.delete.bind(instance)
  observable.has = instance.has.bind(instance)
  observable.set = instance.set.bind(instance)
  observable.get = instance.get.bind(instance)
  observable.transaction = instance.transaction.bind(instance)
  observable.getLength = instance.getLength.bind(instance)
  return observable
}

// optimise memory usage
function ProtoSet (defaultValues, opts) {
  var self = this
  self.object = []
  self.sources = []
  self.releases = []
  self.binder = LazyWatcher.call(self, self._update, self._listen, self._unlisten)
  self.binder.value = this.object

  if (opts && opts.nextTick) self.binder.nextTick = true
  if (opts && opts.idle) self.binder.idle = true
  if (opts && opts.comparer) self.comparer = opts.comparer

  if (defaultValues && defaultValues.length) {
    defaultValues.forEach(function (valueOrObs) {
      if (!~self.sources.indexOf(valueOrObs)) {
        self.sources.push(valueOrObs)
      }
    })
    this._update()
  }
}

ProtoSet.prototype.MutantSet = function (listener) {
  if (!listener) {
    return this.binder.getValue()
  }
  return this.binder.addListener(listener)
}

ProtoSet.prototype.add = function (valueOrObs) {
  if (this.comparer ? this.sources.filter(x => this.comparer(x, valueOrObs)).length == 0 : !~this.sources.indexOf(valueOrObs)) {
    this.sources.push(valueOrObs)
    if (this.binder.live) {
      this.releases[this.sources.length - 1] = this._bind(valueOrObs)
    }
    this.binder.onUpdate()
  }
}

ProtoSet.prototype.clear = function () {
  this.releases.forEach(tryInvoke)
  this.sources.length = 0
  this.releases.length = 0
  this.binder.onUpdate()
}

ProtoSet.prototype.delete = function (valueOrObs) {
  var index = this.sources.indexOf(valueOrObs)
  if (~index) {
    this.sources.splice(index, 1)
    this.releases.splice(index, 1).forEach(tryInvoke)
    this.binder.onUpdate()
  }
}

ProtoSet.prototype.has = function (valueOrObs) {
  return !!~this.object.indexOf(valueOrObs)
}

ProtoSet.prototype.set = function (values) {
  var self = this
  var changed = false

  if (Array.isArray(values)) {
    for (var i = this.sources.length - 1; i >= 0; i -= 1) {
      if (!~values.indexOf(this.sources[i])) {
        changed = true
        self.sources.splice(i, 1)
      }
    }
    values.forEach(function (value) {
      if (!~self.sources.indexOf(value)) {
        changed = true
        self.sources.push(value)
      }
    })
  } else {
    if (self.sources.length > 0) {
      self.sources.length = 0
      changed = true
    }
  }

  if (changed) {
    self.binder.onUpdate()
  }
}

ProtoSet.prototype.get = function (index) {
  return this.sources[index]
}

ProtoSet.prototype.getLength = function () {
  return this.sources.length
}

ProtoSet.prototype._bind = function (valueOrObs) {
  return typeof valueOrObs === 'function' ? valueOrObs(this.binder.onUpdate) : null
}

ProtoSet.prototype.transaction = function (fn) {
  this.binder.transaction(this, fn)
}

ProtoSet.prototype._listen = function () {
  var self = this
  self.sources.forEach(function (obs, i) {
    self.releases[i] = self._bind(obs)
  })
}

ProtoSet.prototype._unlisten = function () {
  this.releases.forEach(tryInvoke)
  this.releases.length = 0
}

ProtoSet.prototype._update = function () {
  var currentValues = this.object.map(get)
  var newValues = this.sources.map(resolve)
  currentValues.filter(notIncluded, newValues).forEach(removeFrom, this.object)
  newValues.filter(notIncluded, currentValues).forEach(addTo, this.object)
  return true
}

function get (value) {
  return value
}

function resolve (source) {
  return typeof source === 'function' ? source() : source
}

function notIncluded (value) {
  return !~this.indexOf(value)
}

function removeFrom (item) {
  var index = this.indexOf(item)
  if (~index) {
    this.splice(index, 1)
  }
}

function addTo (item) {
  this.push(item)
}

function tryInvoke (func) {
  if (typeof func === 'function') {
    func()
  }
}
