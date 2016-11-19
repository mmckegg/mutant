var resolve = require('./resolve')
var isObservable = require('./is-observable')
var onceIdle = require('./once-idle')

module.exports = watchAll

function watchAll (observables, listener, opts) {
  if (!Array.isArray(observables)) {
    observables = [ observables ]
  }

  var broadcasting = false
  var releases = observables.map(bind, broadcast)

  broadcast()

  return function () {
    releases.forEach(tryInvoke)
    releases.length = 0
  }

  function broadcast () {
    if (opts && opts.idle) {
      if (!broadcasting) {
        broadcasting = true
        onceIdle(broadcastNow)
      }
    } else if (opts && opts.nextTick) {
      if (!broadcasting) {
        broadcasting = true
        setImmediate(broadcastNow)
      }
    } else {
      broadcastNow()
    }
  }

  function broadcastNow () {
    broadcasting = false
    listener.apply(this, observables.map(resolve))
  }
}

function bind (value) {
  if (isObservable(value)) {
    return value(this)
  }
}

function tryInvoke (value) {
  if (typeof value === 'function') {
    return value()
  }
}
