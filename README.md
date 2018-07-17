# mutant

Create observables and map them to DOM elements. Massively inspired by [hyperscript](https://github.com/dominictarr/hyperscript) and [`observ-*`](https://github.com/Raynos/observ).

No virtual DOM, just direct observable bindings. Unnecessary garbage collection is avoided by using mutable objects instead of blasting immutable junk all over the place.

## Current Status: Experimental / Maintained

Expect breaking changes.

## Used By

- **[Loop Drop](https://github.com/mmckegg/loop-drop-app)**: Live electronic music performance app. MIDI looper, modular synth and sampler app built around Novation Launchpad controller. Powered by Web Audio, Web MIDI, and [electron](https://electron.atom.io).
- **[Patchwork](https://github.com/ssbc/patchwork)**: A decentralized messaging and sharing app built on top of [Secure Scuttlebutt (SSB)](https://scuttlebutt.nz).
- **[Ferment](https://github.com/mmckegg/ferment)**: Peer-to-peer audio publishing and streaming application. Like SoundCloud but decentralized. A mashup of [ssb](https://scuttlebutt.nz/), [webtorrent](https://webtorrent.io/) and [electron](https://electron.atom.io).

## Install

```bash
npm install mutant --save
```

## Compatibility

Requires an environment that supports:
  - `setImmediate(fn)`
  - `requestIdleCallback(fn)` (optional, only when using `{idle: true}`, `mutant/once-idle` or `mutant/idle-proxy`)
  - `Map` and `WeakMap`
  - `element.classList`
  - `MutationObserver` (optional, only for root `html-element` binding support)
  - ES5 arrays (`Array.prototype.forEach`, etc)
  - `Array.prototype.includes`

## Example

```js
var h = require('mutant/html-element')
var Struct = require('mutant/struct')
var send = require('mutant/send')
var computed = require('mutant/computed')
var when = require('mutant/when')

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

---

## Types

Observables that store data

- [Array](#array)
- [Dict](#dict)
- [Set](#set)
- [Struct](#struct)
- [Value](#value)
- MappedArray
- MappedDict

### Value

The classic observable - stores a single value, updates listeners when the values changes.

``` js
var Value = require('mutant/value')

var obs = Value()
obs.set(true)
//set listener
obs(value => { 
  // called with resolved value whenever the observable changes
})
```

This is almost the same as [observable](https://github.com/dominictarr/observable) and [observ](https://github.com/raynos/observ). There's only a couple of small differences: you can specify a default value (fallback when null) and it will throw if you try and add a non-function as a listener (this one always got me)


### Array

An observable with additional _array like_ methods, which update the observable. The array items can be ordinary
values or observables. 

Like [observ-array](https://github.com/raynos/observ-array) but as with struct, emits the same object. No constant shallow cloning on every change. You can push observables (or ordinary values) and it will emit whenever any of them change. Works well with mutant/map.

There's also `mutant/set` which is similar but only allows values to exist once.

additional methods:
* `array.get(index)` get the value at `index`
* `array.getLength()` get the length of the array
* `array.put(index, value)` set item at `index` to `value`
* `array.push(value)` append `value` to end of `array`.
* `array.pop()` remove item from end.
* `array.shift()` remove item from start.
* `array.insert(value, index)` equivalent to `[].splice(index, 0, value)` on a standard js array.
* `array.delete(value)` remove the first occurance of `value` from the array.
* `array.deleteAt(index)` remove item at `index`.
* `array.transaction(fn)` apply a series of changes to the array and then update listeners in one go.
* `array.includes(item)` check if the array includes `item` 
* `array.indexOf(item)` find the index of `item` in the array
* `array.find(fn)` return the first `item` array for which `fn(item) == true`
* `array.forEach(fn)` iterate over all raw items in the array
* `array.set(array)` overwrite the contents of the mutant array with `array`
* `array.clear()` remove all items.

### Dict

The complement to [Struct](#Struct) - but instead of representing a fixed set of sub-observables, it's a single observable which you can add sub-keys to.

``` js
var Dict = require('mutant/dict')
var d = Dict()
d.put('key', 1)
d(function (v) {
  // => {key: 1}
})

```

additional methods:
* `dict.put(key, value)` set property `key` to `value`
* `dict.delete(key)` remove property `key`
* `dict.has(key)` returns true if `key` is present.
* `dict.keys()` return array of keys.

### Set

Represents a collection like [Array](#Array) except without ordering or duplicate values.

additional methods:
* `set.add(value)` add `value` to the set.
* `set.clear()` remove all items.
* `set.has()` check if item is in the set.
* `set.get(index)` get the item at `index` in the underlying array
* `set.getLength()` get the number of items in the set.

### Struct

Take a fixed set of observables (or values) and return a single observable of the observed values, which updates whenever the inner values update. Subobservables can by any observable type.

They also have a `set` function which can be used to push a json object into the nested observables. Any additional set keys will be preserved if you resolve it.

Mostly the same as [observ-struct](https://github.com/raynos/observ-struct) except that it always emits the same object (with the properties changed). This means it violates immutability, but the trade-off is less garbage collection. The rest of the mutant helpers can handle this case pretty well.

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

You can use these as your primary state atoms. I often use them like classes, extending them with additional methods to help with a given role. 

Another nice side effect is they work great for serializing/deserializing state. You can call them with `JSON.stringify(struct())` to get their entire tree state, then call them again later with `struct.set(JSON.parse(data))` to put it back. This is how state and file persistence works in [Loop Drop](https://github.com/mmckegg/loop-drop-app).


### MappedArray

...


###	MappedDict

...


---

## ProxyType

A more advanced feature - allow you to create observable slots which allow you to hot-swap observables in/ out of.

- ProxyCollection
- ProxyDictionary
- Proxy


### ProxyCollection

...

### ProxyDictionary

...

### Proxy

...


---

## Transforms

Take one or more observables and transform them into an observable

- [computed](#computed)
- concat
- dictToCollection
- idleProxy
- keys
- lookup
- [map](#map)
- merge
- throttle
- [when](#when)

### computed

Take an array of observables, and map them through a function that to produce a custom observable.

``` js
//observable that is true if A or B are true

var computed = require('mutant/computed')

var aOrB = computed([a, b], (a, b) => { 
  return a || b 
})
```

Once again, similar to the observ and observable implementations. It has a few key differences though.

- It will try to avoid computing if its inputs have not changed.
- It also won't emit a change if the new computed value is the same as the old one. This helps to prevent additional work duplication and render noise downstream.
- There is an optional "nextTick" mode that queues up change events until nextTick before computing. But if you call it (`value()`) in the current tick, it will compute immediately.
- It acts like a pull through stream: if it doesn't have a sink, no code is run. It won't bind and resolve until it gets a listener itself.
- It accepts non-observable values too. This makes it possible to pass all state to a shared computed function (no need to waste more memory on those extra closures)
- If the value returned by the compute function is an observable, it will bind to this and emit the resolve values. Crazy nested computes FTW!
- These extra features do take up a bit of extra memory so I use an internal prototype (not visible to api) to reduce the footprint below that of observable and observ/computed

### map

Apply a function to the value in another observable and update whenever that observable updates. Like computed, but for only one input.

A `through` transform. It won't do any work and won't listen to its parents unless it has a listener. Calls your function with the original observable object (not the resolve value). You can then return an additional observable value as its result. It has methods on it that make it behave like an array.

One of the most interesting features is its `maxTime` option. This is a ms value that specifies the max time to spend in a tight loop before emit the changes so far. This makes rendering large datasets to DOM elements much more responsive - a lot more like how the browser does it when it parses html. Things load in little chunks down the page. This for me has made it much easier to build apps that feel responsive and leave the main thread available for more important things (like playing sound).


### concat

...


### dictToCollection

...


### idleProxy

...


### keys

...


### lookup

...



### merge

...


### throttle

...


### when

``` js
var when = require('mutant/when')

when(
  obs,
  A,      // if true
  B       // if false (optional)
)
// => observable
```

Behaves like an observable ternary.

Take an observable `obs` and return the second argument `A` if `obs` is truthy. An optional third argument `B` can be passed and will return if `obs` is falsey.

---

## Sinks

Stuff that are exit hatches / sinks / make changes in the real world.

- HtmlElement
- watchAll
- watchThrottle
- watch


### HtmlElement / h

A fancy wrapper around `document.createElement()` that allows you to create DOM elements (entire trees if needed) without setting lots of properties or writing html. It just returns plain old DOM elements that can be added directly to the DOM.

This is basically just [hyperscript](https://github.com/dominictarr/hyperscript) with a bunch of small tweaks that make it a lot more memory friendly. I've also enhanced the binding ability.

In hyperscript you can add [observables](https://github.com/dominictarr/observable) as properties and when the observable value changes, the DOM magically updates. You can also return a DOM element. But in mutant, I've gone an extra step further and allow observables to return **multiple DOM elements**. I've also made "cleanup" (unbinding from events to free memory) automatic. It's a lot like pull streams: the DOM acts as a sink. **If an element created by mutant is not in the DOM, it doesn't listen to its observable properties.** It only resolves them once it is added, and if it is removed unlistens again.


### watchAll

...


### watchThrottle

...


### watch

- This is a generic sink. Almost the same as listening to a value using `value(function (v) { })` except that it emits the initial value too.
- It also accepts non-observable objects and will just emit their value once and then never all again. Kind of like Promise.resolve(). (I think, never used promises)


---

## Helpers

A grab bag of useful things for dealing with mutant stuff.
A lot of these are used internally, but are useful more generally

- forEachPair
- forEach
- isObservable
- onceIdle
- resolve
- send


### forEachPair

...


### forEach

...


### isObservable

...


### onceIdle

delay a function until the next [idle callback](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestIdleCallback)
without hammering the `requestIdleCallback` api

``` js
var onceIdle = require('mutant/once-idle')
onceIdle(function () {
  //called once, at some later point (after rendering and such)
})
```


### resolve

...


### send

...



---

## License

MIT
