module.exports = function (target, list, checkUpdated) {
  target.get = function (index) {
    checkUpdated && checkUpdated()
    return list[index]
  }

  target.getLength = function (index) {
    checkUpdated && checkUpdated()
    return list.length
  }

  target.includes = function (valueOrObs) {
    checkUpdated && checkUpdated()
    return !!~list.indexOf(valueOrObs)
  }

  target.indexOf = function (valueOrObs) {
    checkUpdated && checkUpdated()
    return list.indexOf(valueOrObs)
  }

  target.forEach = function (fn, context) {
    checkUpdated && checkUpdated()
    list.slice().forEach(fn, context)
  }

  target.find = function (fn) {
    checkUpdated && checkUpdated()
    return list.find(fn)
  }
}
