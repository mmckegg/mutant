var Struct = require('../struct')
var isObservable = require('../is-observable')

module.exports = function MutantKeyValue (key, value) {
  var result = Struct({key: key, value: value})
  result._type = 'MutantKeyValue'
  result.isBound = isObservable(key) || isObservable(value)
  return result
}
