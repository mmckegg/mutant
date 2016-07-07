module.exports = Send

function Send (fn, data, opts) {
  return {
    fn: fn,
    data: data,
    opts: opts,
    event: null,
    handleEvent: handleEvent
  }
}

function handleEvent (e) {
  e.stopPropagation()
  e.preventDefault()
  this.event = e
  this.fn(this.data)
}
