var computed = require('./computed')

module.exports = When

function When (obs, ifTrue, ifFalse) {
  return computed([obs, ifTrue, ifFalse], lambda)
}

function lambda (value, ifTrue, ifFalse) {
  return value ? ifTrue : ifFalse
}
