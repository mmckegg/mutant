module.exports = watch

function watch (observable, listener) {
  listener = listener || noop
  if (typeof observable === 'function') {
    var remove = observable(listener)
    listener(observable())
    return remove
  } else {
    listener(observable)
    return noop
  }
}

function noop () {}
