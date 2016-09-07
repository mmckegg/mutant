module.exports = function walk (node, fn) {
  var current = node
  while (current) {
    fn(current)
    current = nextNode(current, node)
  }
}

function nextNode (current, root) {
  var result = current.firstChild
  while (current && !result && current !== root) {
    result = current.nextSibling
    current = current.parentNode
  }
  return result
}
