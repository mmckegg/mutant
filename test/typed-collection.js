require('setimmediate')
require('source-map-support').install()

var test = require('tape')

var TypedCollection = require('../typed-collection')
var Struct = require('../struct')
var Value = require('../value')
var resolve = require('../resolve')

test('typed-collection', function(t) {
  var types = {
    Cat () {
      return Struct({
        id: Value(),
        age: Value()
      }) 
    },
    Dog () {
      return Struct({
        id: Value(),
        age: Value()
      }) 
    }
  }

  var added = []
  var removed = []
  
  var state = TypedCollection((value) => types[value.type](), {
    matcher: (value) => value.id,
    invalidator: (current, newValue) => current.type != newValue.type,
    onAdd: (obj) => added.push(obj),
    onRemove: (obj) => removed.push(obj),
  })
  
  state.set([
    {id: 1, age: 2, type: 'Dog'},
    {id: 2, age: 9, type: 'Cat'}
  ])

  t.deepEqual(state(), [
    {id: 1, age: 2, type: 'Dog'},
    {id: 2, age: 9, type: 'Cat'}
  ], 'Initial state')

  t.equal(added.length, 2, 'Two new items added')
  added.length = 0
  
  // reverse order, dog is now one year older!
  state.set([
    {id: 2, age: 9, type: 'Cat'},
    {id: 1, age: 3, type: 'Dog'}
  ])

  // no new items created
  t.equal(added.length, 0, 'No new items added')
  added.length = 0
  
  t.deepEqual(state(), [
    {id: 2, age: 9, type: 'Cat'},
    {id: 1, age: 3, type: 'Dog'}
  ], 'Order reversed, 2 is updated')

  // model order changed
  t.equal(state.get(0).id(), 2, 'item moved')
  t.equal(state.get(1).id(), 1, 'item moved')

  
  state.set([
    {id: 1, age: 3, type: 'Cat'},
    {id: 2, age: 9, type: 'Cat'}
  ])

  t.deepEqual(state(), [
    {id: 1, age: 3, type: 'Cat'},
    {id: 2, age: 9, type: 'Cat'}
  ], 'Order updated, both items are now cats')

  t.deepEqual(removed.map(resolve), [
    {id: 1, age: 3, type: 'Dog'}
  ])

  t.deepEqual(added.map(resolve), [
    {id: 1, age: 3, type: 'Cat'}
  ])

  added.length = 0
  removed.length = 0

  t.equal(state.get(0).id(), 1)
  t.equal(state.get(1).id(), 2)

  state.move(state.get(1), 0)

  t.deepEqual(state(), [
    {id: 2, age: 9, type: 'Cat'},
    {id: 1, age: 3, type: 'Cat'}
  ], 'Item moved')

  state.insert({id: 0, type: 'Dog', age: 1}, 0)

  t.deepEqual(state(), [
    {id: 0, age: 1, type: 'Dog'},
    {id: 2, age: 9, type: 'Cat'},
    {id: 1, age: 3, type: 'Cat'}
  ], 'Item inserted')


  t.deepEqual(added.map(resolve), [
    {id: 0, age: 1, type: 'Dog'}
  ])
  added.length = 0

  state.push({id: 3, type: 'Dog', age: 2})

  t.deepEqual(added.map(resolve), [
    {id: 3, age: 2, type: 'Dog'}
  ], 'item added')

  t.deepEqual(state(), [
    {id: 0, age: 1, type: 'Dog'},
    {id: 2, age: 9, type: 'Cat'},
    {id: 1, age: 3, type: 'Cat'},
    {id: 3, age: 2, type: 'Dog'}
  ], 'Item pushed')

  added.length = 0

  t.end()
})