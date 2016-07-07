var Value = require('./value')

module.exports = Uniq

function Uniq (obs) {
  var object = []
  update()

  var observable = Value(object)
  var broadcast = observable.set
  obs(refresh)

  observable.has = function (valueOrObs) {
    return !!~object.indexOf(valueOrObs)
  }

  return observable

  function update () {
    var currentValues = object.map(get)
    var newValues = obs()
    currentValues.filter(notIncluded, newValues).forEach(removeFrom, object)
    newValues.filter(notIncluded, currentValues).forEach(addTo, object)
  }

  function refresh () {
    update()
    broadcast(object)
  }
}

function get (value) {
  return value
}

function notIncluded (value) {
  return !~this.indexOf(value)
}

function removeFrom (item) {
  var index = this.indexOf(item)
  if (~index) {
    this.splice(index, 1)
  }
}

function addTo (item) {
  this.push(item)
}
