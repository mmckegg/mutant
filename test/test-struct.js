var Struct = require('../struct')

var struct = Struct({
  a: 'Hello',
  b: 'You',
  c: 123,
  d: Struct({
    tinker: 'value'
  })
})

console.log(struct())
struct(x => console.log(x))
struct.a(x => console.log('a =>', x))
struct.b(x => console.log('b =>', x))
struct.c(x => console.log('c =>', x))
struct.d(x => console.log('d =>', x))

struct.b.set('Cat')

struct.set({
  a: 'Hello',
  b: 'Cat',
  c: 123,
  d: {
    tinker: 456
  }
})
