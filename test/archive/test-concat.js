var Array = require('../array')
var concat = require('../concat')
var Map = require('../map')
var Value = require('../value')
var computed = require('../computed')

var value = Value('human')
var array = Array(['cat'])
var array2 = Array(['cat'])
var result = concat([array, array2])

var map = Map(result, function (obj) {
  if (typeof obj === 'function') {
    console.log('mapping => obs')
    return computed([obj], (x) => x + ' [dynamic]')
  } else {
    console.log('mapping => ', obj)
    return obj + ' [static]'
  }
})

result(x => console.log(x))
map(x => console.log('[map]', x))

array.push('dog')
array2.push('cow')
array.push(value)
array2.push('chicken')
array.push('wolf')
array.delete('cat')
array2.insert('sheep', 0)
value.set('monkey')
