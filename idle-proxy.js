var Proxy = require('./proxy')
var onceIdle = require('./once-idle')

module.exports = function IdleProxy (fn) {
  var obs = Proxy()
  onceIdle(function () {
    obs.set(fn())
  })
  return obs
}
