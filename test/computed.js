require('setimmediate')
require('source-map-support').install()

var test = require('tape')

var computed = require('../computed')
var resolve = require('../resolve')
var Value = require('../value')

test('computed get accessor', function(t) {
  var value = Value(1)
  var obs = computed(value, x => x * 100)
  t.equal(resolve(obs), 100)
  value.set(2)
  t.equal(resolve(obs), 200)
  t.end()
})

test('computed lazy watch', function(t) {
  var value = Value(1)
  var obs = computed(value, x => x * 100)
  t.equal(resolve(obs), 100)

  var observedValues = []
  obs(x => observedValues.push(x))
  value.set(2)
  t.deepEqual(observedValues, [200])

  t.end()
})

test('computed lazy watch with `get` race condition', function(t) {
  var value = Value(1)
  var final = Value()

  var obs = computed(value, x => x * 100)
  t.equal(resolve(obs), 100)

  value(x => {
    resolve(obs) // resolve obs inside of observer
  })

  obs(final.set)

  value.set(2)

  t.deepEqual(resolve(final), 200)
  t.end()
})

test('computed inner update in non-live mode', function (t) {
  var innerValue = Value(1)
  var value = Value(innerValue)
  var obs = computed(value, x => x)
  t.deepEqual(obs(), 1)
  setImmediate(() => {
    innerValue.set(2)
    t.deepEqual(obs(), 2)
    t.end()
  })
})

test('computed nextTick, observe', function (t) {
  var events = []
  var value = Value(1)
  var obs = computed(value, x => x * 100, {nextTick: true})
  obs(value => events.push(value))
  value.set(2)
  t.deepEqual(events, [])
  value.set(3)
  t.deepEqual(events, [])

  setImmediate(() => {
    t.deepEqual(events, [300])
    t.end()
  })
})

test('computed nextTick, same tick `get` (short-circuit delay)', function (t) {
  var value = Value(1)
  var obs = computed(value, x => x * 100, {nextTick: true})
  t.equal(resolve(obs), 100)
  value.set(2)
  t.equal(resolve(obs), 200)
  t.end()
})
