var queue = []

module.exports = function (item) {
  if (queue.length === 0) {
    setImmediate(flush)
  }
  queue.push(item)
}

function flush () {
  while (queue.length) {
    var item = queue.pop()
    if (!item.bound && typeof item.release === 'function') {
      item.release()
      item.release = null
    }
  }
}
