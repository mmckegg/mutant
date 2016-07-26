module.exports = function walk (node, fn) {
  var current = node
  while (current) {
    fn(current)
    current = nextNode(current, node)
  }
}

function nextNode (current, root) {
  var result = current.firstChild || current.nextSibling
  if (!result && current.parentNode && current.parentNode !== root) {
    return current.nextSibling
  } else {
    return result
  }
}
