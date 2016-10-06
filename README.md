mutant
===

Create observables and map them to DOM elements. Massively inspired by [hyperscript](https://github.com/dominictarr/hyperscript) and [`observ-*`](https://github.com/Raynos/observ).

No virtual dom, just direct observable bindings. Unnecessary garbage collection is avoided by using mutable objects instead of blasting immutable junk all over the place.

## Current Status: Experimental / Maintained

Expect breaking changes.

## Used By

- **[Loop Drop](https://github.com/mmckegg/loop-drop-app)**: Live electronic music performance app. MIDI looper, modular synth and sampler app built around Novation Launchpad controller. Powered by Web Audio, Web MIDI, and [electron](https://electron.atom.io).
- **[Ferment](https://github.com/mmckegg/ferment)**: Peer-to-peer audio sharing and streaming application. Like SoundCloud but decentralized. A mashup of [ssb](https://scuttlebot.io/), [webtorrent](https://webtorrent.io/) and [electron](https://electron.atom.io).

## Install

```bash
npm install @mmckegg/mutant --save
```

## Compatibility

Requires an environment that supports:
  - `Map` and `WeakMap`
  - `MutationObserver` (optional, only for root `html-element` binding support)
  - ES5 arrays (`Array.prototype.forEach`, etc)
  - `Array.prototype.includes`

## Use

```js
var h = require('@mmckegg/mutant/html-element')
var Struct = require('@mmckegg/mutant/struct')
var send = require('@mmckegg/mutant/send')
var computed = require('@mmckegg/mutant/computed')
var when = require('@mmckegg/mutant/when')

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
```
