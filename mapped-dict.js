var MutantLookup = require('./lookup')
var MutantDict = require('./dict')
var DictToCollection = require('./dict-to-collection')

module.exports = MutantMappedDict

function MutantMappedDict (defaultItems, lambda, opts) {
  opts = opts || {}

  var list = MutantDict(defaultItems, {
    comparer: opts.comparer
  })

  var observable = MutantLookup(DictToCollection(list), function (item, invalidateOn) {
    var value = lambda(item.key, item.value, invalidateOn)
    if (value[0] === item.key && value[1] === item.value) {
      return item // passthru
    } else {
      return value
    }
  }, opts)

  observable.set = list.set

  observable.put = function (key, item) {
    list.put(key, item)
    return observable.get(key)
  }

  observable.delete = function (key) {
    list.delete(key)
  }

  return observable
}
