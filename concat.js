var computed = require('./computed')

module.exports = function Concat (observables) {
  var values = []
  var rawValues = []

  var result = computed(observables, function (args) {
    var index = 0
    for (var i = 0; i < arguments.length; i++) {
      for (var x = 0; x < arguments[i].length; x++) {
        var value = arguments[i][x]
        var raw = get(observables[i], x)
        values[index] = value
        rawValues[index] = raw
        index += 1
      }
    }
    values.length = index
    rawValues.length = index
    return values
  })

  result.get = function (index) {
    return rawValues[index]
  }

  result.getLength = function (index) {
    return rawValues.length
  }

  result.includes = function (valueOrObs) {
    return !!~rawValues.indexOf(valueOrObs)
  }

  result.indexOf = function (valueOrObs) {
    return rawValues.indexOf(valueOrObs)
  }

  return result
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
