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
    window.requestIdleCallback(flush)
  }
}

function flush () {
  var startedAt = Date.now()

  while (queue.length && Date.now() - startedAt < max) {
    queue.shift()()
  }

  if (queue.length) {
    window.requestIdleCallback(flush)
  } else {
    running = false
  }
}
