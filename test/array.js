require('setimmediate')
var test = require('tape')

var MutantArray = require('../array')
var MutantValue = require('../value')

test('Observable returns contents when called ', function(t) {
  var array = MutantArray(['cat'])
  var actual = array()
  t.deepEqual(actual, ['cat'])
  t.end()
})

test('Observable calls subscribe with latest when updated with set', function(t) {
  var expected = ['dog']
  var array = MutantArray(['cat'])
  array(actual => {
    t.deepEqual(actual, expected)
    t.end()
  })
  array.set(expected)
})

test('Observable calls multiple subscribers with latest when updated with set', function(t) {
  t.plan(2)
  var expected = ['dog']
  var array = MutantArray(['cat'])
  array(actual => {
    t.deepEqual(actual, expected)
  })
  array(actual => {
    t.deepEqual(actual, expected)
  })
  array.set(expected)
})

test('#push inserts a new element and calls subscriber', function(t) {
  var expected = ['cat','dog']
  var array = MutantArray(['cat'])
  array(actual => {
    t.deepEqual(actual, expected)
    t.end()
  })
  array.push('dog')
})

test('#insert inserts element at index and calls subscriber', function(t) {
  var expected = ['dog', 'cat']
  var array = MutantArray(['cat'])
  array(actual => {
    t.deepEqual(actual, expected)
    t.end()
  })
  array.insert('dog', 0)
})

test('Array will call subscriber when an observable in the array is updated', function(t) {
  var obs = MutantValue(1)
  var array = MutantArray([obs])
  array(arr => {
    actual = arr[0] 
    t.equal(actual, 2)
    t.end()
  })
  obs.set(2)
})
