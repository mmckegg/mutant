module.exports = function isReferenceType (value) {
  return typeof value === 'object' && value !== null
}
