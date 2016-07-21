var computed = require('./computed')

module.exports = Keys

function Keys (collection) {
  var result = []
  var initialized = false
  return computed(collection, function (value) {
    var keys = Object.keys(value)
    var changed = false
    for (var i = 0; i < keys.length; i++) {
      if (result[i] !== keys[i]) {
        result[i] = keys[i]
        changed = true
      }
    }

    if (result.length !== keys.length) {
      changed = true
      result.length = keys.length
    }

    if (changed || !initialized) {
      initialized = true
      return result
    } else {
      return computed.NO_CHANGE
    }
  })
}
