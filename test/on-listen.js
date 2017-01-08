var test = require('tape')

// currently only these types support onListen/unlisten
// in the future, all types should allow it!

var types = [
  function array (opts) {
    return require('../array')([], opts)
  },
  function dict (opts) {
    return require('../dict')({}, opts)
  },
  function map (opts) {
    return require('../map')([], () => {}, opts)
  },
  function computed (opts) {
    return require('../computed')({}, () => {}, opts)
  }
]

types.forEach(ctor => {
  test(`${ctor.name} - onListen / onUnlisten`, t => {
    var onListenCount = 0
    var onUnlistenCount = 0

    var obs = ctor({
      onListen: () => {
        onListenCount += 1
      },
      onUnlisten: () => {
        onUnlistenCount += 1
      }
    })

    t.equal(onListenCount, 0)

    var unlisten1 = obs(() => {})
    t.equal(onListenCount, 1)

    var unlisten2 = obs(() => {})
    t.equal(onListenCount, 1) // should still be 1

    unlisten1()
    t.equal(onUnlistenCount, 0)

    unlisten2()
    t.equal(onUnlistenCount, 1)

    var unlisten3 = obs(() => {})
    t.equal(onListenCount, 2)

    unlisten3()
    t.equal(onUnlistenCount, 2)

    t.end()
  })
})
