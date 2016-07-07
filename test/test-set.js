var Set = require('../set')
var Value = require('../value')

var set = Set()
var value = Value('ducks')
set(x => console.log(x))

set.add('cats')
set.add('dogs')
set.add('logs')
set.add('cats')
set.add(value)

value.set('cows')

set.delete('dogs')
set.set(['dogs', 'logs', value])
