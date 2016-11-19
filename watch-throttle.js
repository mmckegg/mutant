var resolve = require('./resolve')
var isObservable = require('./is-observable')

module.exports = function throttledWatch (obs, minDelay, listener, opts) {
  var throttling = false
  var lastRefreshAt = 0
  var lastValueAt = 0
  var throttleTimer = null

  var broadcastInitial = !opts || opts.broadcastInitial !== false

  // default delay is 20 ms
  minDelay = minDelay || 20

  // run unless opts.broadcastInitial === false
  if (broadcastInitial) {
    listener(resolve(obs))
  }

  if (isObservable(obs)) {
    return obs(function (v) {
      if (!throttling) {
        if (Date.now() - lastRefreshAt > minDelay) {
          refresh()
        } else {
          throttling = true
          throttleTimer = setInterval(refresh, minDelay)
        }
      }
      lastValueAt = Date.now()
    })
  } else {
    return noop
  }

  function refresh () {
    lastRefreshAt = Date.now()
    listener(obs())
    if (throttling && lastRefreshAt - lastValueAt > minDelay) {
      throttling = false
      clearInterval(throttleTimer)
    }
  }
}

function noop () {}
