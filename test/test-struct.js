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
var releases = [
  struct(x => console.log(x))
]

struct.b.set('Cat')

struct.set({
  a: 'Hello',
  b: 'Cat',
  c: 123,
  d: {
    tinker: 456
  }
})

while (releases.length) {
  releases.pop()()
}
