
var Mutant = require('./')
var tape = require('tape')
var cache = require('module')._cache

var counts = {}
var MUTANTS = module.exports = Mutant.Value()

for(var k in cache) (function (module) {
  if(
    module.id.indexOf(__dirname) === 0 &&
    !~module.id.substring(__dirname.length).indexOf('node_modules')
  ) {
    var name = module.id.substring(__dirname.length+1)
    var fn = module.exports
    if('function' == typeof fn) {
      module.exports = function () {
        var args = [].slice.call(arguments)
        counts[name] = (counts[name] || 0) + 1
        MUTANTS.set(counts)
        return fn.apply(this, args)
      }
      for(var k in Mutant)
        if(Mutant[k] === fn) {
          Mutant[k] = module.exports
          break
        }
      }
  }
})(cache[k])





















