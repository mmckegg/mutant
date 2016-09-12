var isObservable = require('./is-observable')
var resolve = require('./resolve')

module.exports = function forEachPair (source, fn) {
  if (source) {
    if (isObservable(source) && source.keys && source.get) {
      resolve(source.keys).forEach(function (key) {
        fn(key, source.get(key))
      })
    } else {
      var values = resolve(source)
      if (values) {
        Object.keys(values).forEach(function (key) {
          fn(key, values[key])
        })
      }
    }
  }
}
