require('setimmediate')
require('source-map-support').install()

var test = require('tape')

var MutantChannel = require('../channel')

test('channel', function(t) {
  var channel = MutantChannel()
  var emitted = []
  var unwatch = channel.listen((value) => {
    emitted.push(value)
  })

  channel.broadcast('value')
  t.equal(emitted.length, 1, 'value received')

  channel.broadcast('value2')
  t.equal(emitted.length, 2, 'second value received')

  unwatch()
  channel.broadcast('value3')
  t.equal(emitted.length, 2, 'no recieve after unwatch')

  t.deepEqual(emitted, [
    'value', 'value2'
  ], 'correct values')

  t.end()
})
