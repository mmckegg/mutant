require('setimmediate')
require('source-map-support').install()

var test = require('tape')

var MutantValue = require('../value')
var watchThrottle = require('../watch-throttle')

test('watchThrottle: nextTick option', function(t) {
  var value = MutantValue()
  var checker = function (value) {}
  watchThrottle(value, 100, (value) => {
    checker(value)
  }, {
    nextTick: true
  })
  
  var nextTick = false
  var callCount = 0
  setImmediate(() => {nextTick = true})
  checker = (value) => {
    callCount += 1
    t.equal(callCount, 1, 'only called once')
    t.equal(value, 'new value3')
    t.equal(nextTick, true, 'called after nextTick')
    t.end()
  }
  value.set('new value')
  value.set('new value2')
  value.set('new value3')
})

test('watchThrottle: correctly handle throttling when nextTick option enabled', function(t) {
  var value = MutantValue()
  var checker = function (value) {}
  watchThrottle(value, 100, (value) => {
    checker(value)
  }, {
    nextTick: true
  })
  
  var nextTick = false
  setImmediate(() => {nextTick = true})
  checker = (value) => {
    t.equal(value, 'new value2', 'use latest value on nextTick')
    t.equal(nextTick, true, 'called after nextTick')
    let callCount = 0
    checker = (value) => {
      callCount += 1
      t.equal(callCount, 1, 'only called once after nextTick')
      t.equal(value, 'new value5', 'use latest value on throttle')
      t.end()
    }
  }
  value.set('new value')
  value.set('new value2')

  setTimeout(() =>value.set('new value3'), 10)
  setTimeout(() =>value.set('new value4'), 20)
  setTimeout(() =>value.set('new value5'), 30)
})