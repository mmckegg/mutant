var computed = require('./computed')
var isObservable = require('./is-observable')

module.exports = When

function When (obs, ifTrue, ifFalse) {
  ifTrue = handleInnerValues(ifTrue)
  ifFalse = handleInnerValues(ifFalse)
  return computed([obs, ifTrue, ifFalse], lambda)
}

function lambda (value, ifTrue, ifFalse) {
  return value ? ifTrue : ifFalse
}

function handleInnerValues (obs) {
  if (Array.isArray(obs) && obs.some(isObservable)) {
    // HACK: resolve inner observs
    var inner = []
    return computed(obs, function () {
      for (var i = 0; i < arguments.length; i++) {
        inner[i] = arguments[i]
      }
      inner.length = arguments.length
      return inner
    })
  }
  return obs
}
