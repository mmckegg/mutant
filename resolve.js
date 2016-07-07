module.exports = resolve

function resolve (source) {
  return typeof source === 'function' ? source() : source
}
