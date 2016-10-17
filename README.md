# mutant

Create observables and map them to DOM elements. Massively inspired by [hyperscript](https://github.com/dominictarr/hyperscript) and [`observ-*`](https://github.com/Raynos/observ).

No virtual DOM, just direct observable bindings. Unnecessary garbage collection is avoided by using mutable objects instead of blasting immutable junk all over the place.

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
  - `setImmediate(fn)`
  - `Map` and `WeakMap`
  - `MutationObserver` (optional, only for root `html-element` binding support)
  - ES5 arrays (`Array.prototype.forEach`, etc)
  - `Array.prototype.includes`

## Example

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

## Overview

### mutant/html-element

A fancy wrapper around `document.createElement()` that allows you to create DOM elements (entire trees if needed) without setting lots of properties or writing html. It just returns plain old DOM elements that can be added directly to the DOM.

This is basically just [hyperscript](https://github.com/dominictarr/hyperscript) with a bunch of small tweaks that make it a lot more memory friendly. I've also enhanced the binding ability.

In hyperscript you can add [observables](https://github.com/dominictarr/observable) as properties and when the observable value changes, the DOM magically updates. You can also return a DOM element. But in mutant, I've gone an extra step further and allow observables to return **multiple DOM elements**. I've also made "cleanup" (unbinding from events to free memory) automatic. It's a lot like pull streams: the DOM acts as a sink. **If an element created by mutant is not in the DOM, it doesn't listen to its observable properties.** It only resolves them once it is added, and if it is removed unlistens again.

### mutant/value

This is almost the same as [observable](https://github.com/dominictarr/observable) and [observ](https://github.com/raynos/observ). There's only a couple of small differences: you can specify a default value (fallback when null) and it will throw if you try and add a non-function as a listener (this one always got me)

### mutant/computed

Once again, similar to the observ and observable implementations. It has a few key differences though.

- It will try to avoid computing if its inputs have not changed.
- It also won't emit a change if the new computed value is the same as the old one. This helps to prevent additional work duplication and render noise downstream.
- There is an optional "nextTick" mode that queues up change events until nextTick before computing. But if you call it (`value()`) in the current tick, it will compute immediately.
- It acts like a pull through stream: if it doesn't have a sink, no code is run. It won't bind and resolve until it gets a listener itself.
- It accepts non-observable values too. This makes it possible to pass all state to a shared computed function (no need to waste more memory on those extra closures)
- If the value returned by the compute function is an observable, it will bind to this and emit the resolve values. Crazy nested computes FTW!
- These extra features do take up a bit of extra memory so I use an internal prototype (not visible to api) to reduce the footprint below that of observable and observ/computed

### mutant/watch

- This is a generic sink. Almost the same as listening to a value using `value(function (v) { })` except that it emits the initial value too.
- It also accepts non-observable objects and will just emit their value once and then never all again. Kind of like Promise.resolve(). (I think, never used promises)

### mutant/struct

Basically the same as [observ-struct](https://github.com/raynos/observ-struct) except that it always emits the same object (with the properties changed). This means it violates immutability, but the trade-off is less garbage collection. The rest of the mutant helpers can handle this case pretty well.

They accept a set list of keys that specify types. For example:

```js
var struct = MutantStruct({
  description: Value(),
  tags: Set(),
  likes: Value(0, {defaultValue: 0}),
  props: MutantArray(),
  attrs: MutantDict()
})
```

You can use these as your primary state atoms. I often use them like classes, extending them with additional methods to help with a given role. Another nice side effect is they work great for serializing/deserializing state. You can call them with `JSON.stringify(struct())` to get their entire tree state, then call them again later with `struct.set(JSON.parse(data))` to put it back. This is how state and file persistence works in [Loop Drop](https://github.com/mmckegg/loop-drop-app).

### mutant/array

Like [observ-array](https://github.com/raynos/observ-array) but as with struct, emits the same object. No constant shallow cloning on every change. You can push observables (or ordinary values) and it will emit whenever any of them change. Works well with mutant/map.

There's also `mutant/set` which is similar but only allows values to exist once.

### mutant/map

A `through` transform. It won't do any work and won't listen to its parents unless it has a listener. Calls your function with the original observable object (not the resolve value). You can then return an additional observable value as its result. It has methods on it that make it behave like an array.

One of the most interesting features is its `maxTime` option. This is a ms value that specifies the max time to spend in a tight loop before emit the changes so far. This makes rendering large datasets to DOM elements much more responsive - a lot more like how the browser does it when it parses html. Things load in little chunks down the page. This for me has made it much easier to build apps that feel responsive and leave the main thread available for more important things (like playing sound).

### and others

Then there's a bunch of other helper modules that transform the data in different ways and allow proxying observables. There's a lookup helper that converts collections into dicts.

But yeah, not really much too it. Just my own personal collection of tools for building interfaces, binding and persisting data (oh and that don't cause audio glitches - which as a side effect means super responsive and smooth scrolling with no "jank")

## License

MIT
