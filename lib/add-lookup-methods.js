module.exports = function (target, lookup, checkUpdated) {
  target.keys = function () {
    checkUpdated && checkUpdated()
    return Object.keys(lookup)
  }

  target.get = function (key) {
    checkUpdated && checkUpdated()
    return lookup[key]
  }

  target.has = function (key) {
    checkUpdated && checkUpdated()
    return key in lookup
  }
}
