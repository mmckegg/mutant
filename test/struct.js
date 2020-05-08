var test = require('tape')
require('source-map-support').install()

var MutantDict = require('../dict')
var MutantStruct = require('../struct')

test(`struct: isStruct`, t => {
  var struct = MutantStruct({})
  var dict = MutantDict()
  t.equal(MutantStruct.isStruct(struct), true)
  t.equal(MutantStruct.isStruct(dict), false)
  t.end()
})