module.exports = function isSame (a, b, compare) {
  if (compare && compare(a, b)) {
    return true
  } else if (typeof a !== typeof b || (typeof a === 'object' && a !== null)) {
    return false
  } else {
    return a === b
  }
}
