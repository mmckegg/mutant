var Proxy = require('./proxy')
var animationFrame = require('./animation-frame')

module.exports = function AnimationFrameProxy (fn) {
  var obs = Proxy()
  animationFrame(() => obs.set(fn()))
  return obs
}
