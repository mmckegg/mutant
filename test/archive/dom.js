var Struct = require('../struct')
var send = require('../send')
var h = require('../html-element')
var computed = require('../computed')
var when = require('../when')

var state = Struct({
  text: 'Test',
  color: 'red',
  value: 0
})

var isBlue = computed([state.color], color => color === 'blue')

var element = h('div.cool', {
  classList: ['cool', state.text],
  style: {
    'background-color': state.color
  }
}, [
  h('div', [
    state.text, ' ', state.value, ' ', h('strong', 'test')
  ]),
  h('div', [
    when(isBlue,
      h('button', {
        'ev-click': send(state.color.set, 'red')
      }, 'Change color to red'),
      h('button', {
        'ev-click': send(state.color.set, 'blue')
      }, 'Change color to blue')
    )

  ])
])

setTimeout(function () {
  state.text.set('Another value')
}, 5000)

setInterval(function () {
  state.value.set(state.value() + 1)
}, 1000)

setInterval(function () {
  // bulk update state
  state.set({
    text: 'Retrieved from server (not really)',
    color: '#FFEECC',
    value: 1337
  })
}, 10000)

document.body.appendChild(element)
