require('setimmediate')
require('source-map-support').install()

var test = require('tape')

var MutantArray = require('../array')
var reverse = require('../reverse')
var Struct = require('../struct')

test('reverse - result is reversed', function(t) {
  var array = MutantArray(['cat', 'dog', 'cow', 'sheep'])
  var reversed = reverse(array)
  var actual = reversed()
  t.deepEqual(actual, ['sheep', 'cow', 'dog', 'cat'])
  t.end()
})

test('reverse - raw objects preserved', function(t) {
  // this is what makes reverse better than just using computed
  let struct0 = Struct({value: 0})
  let struct1 = Struct({value: 1})
  let struct2 = Struct({value: 2})

    var array = MutantArray([
      struct0, struct1, struct2
    ])

    var reversed = reverse(array)
    var raw = []

    reversed.forEach(item => {
      raw.push(item)
    })

    t.deepEqual(raw, [
      struct2, struct1, struct0
    ])

    t.end()
  })
  