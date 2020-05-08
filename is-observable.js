module.exports = isObservable

function isObservable (obj) {
  return typeof obj === 'function' && obj.length === 1
}
