var test = require('tape')
require('source-map-support').install()

var h = require('../h')
var Value = require('../value')

test(`HtmlElement: dataset`, t => {
  var obs = Value('value3')
  var obs2 = Value('shorthand obs')

  var element = h('div', {
    dataset: {
      a: 'value1',
      b: 'value2',
      c: obs
    },
    'data-d': 'shorthand',
    'data-e': obs2
  })

  // add to dom for events to flow
  document.body.append(element)

  setImmediate(() => {
    t.equal(element.dataset.a, 'value1', 'set data')
    t.equal(element.dataset.b, 'value2', 'set data')
    t.equal(element.dataset.c, 'value3', 'bind data')
    t.equal(element.dataset.d, 'shorthand', 'set data with shorthand')
    t.equal(element.dataset.e, 'shorthand obs', 'bind data with shorthand')
  
    obs.set('value4')
    t.equal(element.dataset.c, 'value4', 'dataset updates when observable changes')
  
  
    obs2.set('change shorthand obs')
    t.equal(element.dataset.e, 'change shorthand obs', 'shorthand dataset updates when observable changes')
  
    t.end()
  })
})