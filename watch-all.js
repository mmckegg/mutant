var resolve = require('./resolve')
var isObservable = require('./is-observable')

module.exports = watchAll

function watchAll (observables, listener) {
  if (!Array.isArray(observables)) {
    observables = [ observables ]
  }

  var releases = observables.map(bind, broadcast)
  broadcast()

  return function () {
    releases.forEach(tryInvoke)
    releases.length = 0
  }

  function broadcast () {
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
