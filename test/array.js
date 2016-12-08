require('setimmediate')
var test = require('tape')

var MutantArray = require('../array');

test('Observable returns contents when called ', function(t) {
  var array = MutantArray(['cat'])
  var actual = array()
  t.deepEqual(actual, ['cat'])
  t.end()
})
