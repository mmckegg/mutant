var resolve = require('./resolve')

module.exports = function forEach (sources, fn) {
  if (sources && !sources.forEach) {
    sources = resolve(sources)
  }

  if (sources && sources.forEach) {
    sources.forEach(fn)
  }
}
