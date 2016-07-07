var Array = require('../array')
var Value = require('../value')

var value = Value('human')
var array = Array(['cat'])
array(x => console.log(x))

array.push('dog')
array.push('cow')
array.push(value)
array.push('chicken')
console.log('shift =>', array.shift())
array.push('wolf')
array.insert('sheep', 0)
console.log('pop =>', array.pop())

value.set('monkey')
