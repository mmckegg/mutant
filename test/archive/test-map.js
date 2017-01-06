var Array = require('../array')
var Map = require('../map')
var Value = require('../value')
var computed = require('../computed')

var value = Value('human')
var array = Array(['cat'])
var map = Map(array, function (obj) {
  if (typeof obj === 'function') {
    console.log('mapping => obs')
    return computed([obj], (x) => x + ' [dynamic]')
  } else {
    console.log('mapping => ', obj)
    return obj + ' [static]'
  }
})

map(x => console.log(x))

array.push('dog')
array.push('cow')
array.push(value)
array.push('chicken')
array.push('wolf')
array.insert('sheep', 0)
value.set('monkey')

// offline invalidate
var invalidator = Value(false)
var count = 0
var thing = Map(Array(['cat']), function (obj, invalidateOn) {
  invalidateOn(invalidator)
  return count++
})
console.log(thing())
invalidator.set(true)
console.log(thing())
