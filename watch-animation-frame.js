module.exports = function watchAnimationFrame (listener) {
    var handle = null
    var stopped = false
    var renderLoop = function (ev) {
      if (stopped) return
      listener(ev)
      handle = window.requestAnimationFrame(renderLoop)
    }
  
    renderLoop()
  
    return function unwatch () {
      stopped = true
      window.cancelAnimationFrame(handle)
    }
  }
  