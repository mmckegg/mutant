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
    if (!item.bound) {
      item.invalidated = true
    }
  }
}
