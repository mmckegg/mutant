var test = require('tape')
require('source-map-support').install()

var MutantArray = require('../array')
var MutantDict = require('../dict')
var MutantSet = require('../set')

test(`array - transaction`, t => {
  var array = MutantArray()
  var changes = []
  array(x => changes.push(x))

  array.transaction(() => {
    array.push(1)
    array.push(2)
    array.push(3)
  })

  t.deepEqual(changes, [[1, 2, 3]])
  t.end()
})

test(`dict - transaction`, t => {
  var dict = MutantDict()
  var changes = []
  dict(x => changes.push(x))

  dict.transaction(() => {
    dict.put('a', 1)
    dict.put('b', 2)
    dict.put('c', 3)
  })

  t.deepEqual(changes, [{a: 1, b: 2, c: 3}])
  t.end()
})

test(`set - transaction`, t => {
  var set = MutantSet()
  var changes = []
  set(x => changes.push(x))

  set.transaction(() => {
    set.add(1)
    set.add(2)
    set.add(3)
  })

  t.deepEqual(changes, [[1, 2, 3]])
  t.end()
})
