var requestIdleCallback = require('request-idle-callback').requestIdleCallback

var queue = []
var running = false
var max = 1000 / 60

module.exports = function (fn) {
  if (typeof fn !== 'function') {
    throw new Error('Must be a function')
  }
  queue.push(fn)
  if (!running) {
    running = true
    requestIdleCallback(flush)
  }
}

function flush () {
  var startedAt = Date.now()

  while (queue.length && Date.now() - startedAt < max) {
    queue.shift()()
  }

  if (queue.length) {
    requestIdleCallback(flush)
  } else {
    running = false
  }
}
