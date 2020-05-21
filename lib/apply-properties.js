var isObservable = require('../is-observable')
var Set = require('../set')
var watch = require('../watch')

module.exports = applyProperties

function applyProperties (target, properties, data) {
  var classList = Set()
  if (target.classList && target.classList.value) {
    classList.add(target.classList.value)
  }

  for (var key in properties) {
    var valueOrObs = properties[key]

    if (key === 'style') {
      // TODO: handle observable at root for style objects
      var value = resolve(valueOrObs)
      for (var k in value) {
        var styleObs = isObservable(value[k]) ? value[k] : null
        if (styleObs) {
          data.bindings.push(new Binding(bindStyle, target, styleObs, k))
        } else {
          target.style.setProperty(k, value[k])
        }
      }
    } else if (key === 'hooks') {
      var value = resolve(valueOrObs)
      if (Array.isArray(value)) {
        value.forEach(function (v) {
          // hookBindings are treated the same as bindings, except that they bypass intersectionBindingViewport
          data.hookBindings.push(new HookBinding(v, target))
        })
      }
    } else if (key === 'attributes') {
      var value = resolve(valueOrObs)
      for (var k in value) {
        var attrObs = isObservable(value[k]) ? value[k] : null
        if (attrObs) {
          data.bindings.push(new Binding(bindAttr, target, attrObs, k))
        } else {
          target.setAttribute(k, value[k])
        }
      }
    } else if (key === 'dataset') {
      // TODO: handle observable at root for dataset objects
      var value = resolve(valueOrObs)
      for (var k in value) {
        var dataObs = isObservable(value[k]) ? value[k] : null
        if (dataObs) {
          data.bindings.push(new Binding(bindData, target, dataObs, k))
        } else {
          target.dataset[k] = value[k]
        }
      }
    }else if (key === 'events') {
      for (var name in valueOrObs) {
        target.addEventListener(name, valueOrObs[name], false)
      }
    } else if (key.slice(0, 3) === 'ev-') {
      target.addEventListener(key.slice(3), valueOrObs, false)
    } else if (key.slice(0, 5) === 'data-') {
      var k = key.slice(5)
      var dataObs = isObservable(valueOrObs) ? valueOrObs : null
      if (dataObs) {
        data.bindings.push(new Binding(bindData, target, dataObs, k))
      } else {
        target.dataset[k] = valueOrObs
      }
    } else if (key === 'className' || key === 'classList') {
      if (Array.isArray(valueOrObs)) {
        valueOrObs.forEach(function (v) {
          classList.add(v)
        })
      } else {
        classList.add(valueOrObs)
      }
    } else {
      target[key] = resolve(valueOrObs)
      var obs = isObservable(valueOrObs) ? valueOrObs : null
      if (obs) {
        data.bindings.push(new Binding(bind, target, obs, key))
      }
    }
  }

  if (containsObservables(classList)) {
    data.bindings.push(new Binding(bindClassList, target.classList, classList, 'value'))
  } else {
    // OPTIMISATION: no need to create a binding if the list is never going to change
    target.classList.value = classList().join(' ')
  }
}

function containsObservables (obs) {
  for (var i = 0, len = obs.getLength(); i < len; i++) {
    if (isObservable(obs.get(i))) {
      return true
    }
  }
}

function bindClassList (target, obs, key) {
  return watch(obs, function boundClassList (value) {
    value = [].concat.apply([], value).filter(present).join(' ')
    if (value || target[key]) {
      target[key] = value
    }
  })
}

function bindStyle (target, styleObs, key) {
  return watch(styleObs, function boundStyle (value) {
    target.style.setProperty(key, value)
  })
}

function bindData (target, dataObs, key) {
  return watch(dataObs, function boundData (value) {
    target.dataset[key] = value
  })
}

function bindAttr (target, attrObs, key) {
  return watch(attrObs, function boundAttr (value) {
    if (value == null) {
      target.removeAttribute(key)
    } else {
      target.setAttribute(key, value)
    }
  })
}

function bind (target, obs, key) {
  return watch(obs, function bound (toValue) {
    var fromValue = target[key]
    if (fromValue !== toValue) {
      target[key] = toValue
    }
  })
}

function present (val) {
  return val != null
}

function resolve (source) {
  return typeof source === 'function' ? source() : source
}

function Binding (fn, element, source, key) {
  this.element = element
  this.source = source
  this.key = key
  this.fn = fn
  this.bound = false
}

Binding.prototype = {
  bind: function () {
    if (!this.bound) {
      this._release = this.fn(this.element, this.source, this.key)
      this.bound = true
    }
  },
  unbind: function () {
    if (this.bound) {
      this._release()
      this._release = null
      this.bound = false
    }
  }
}

function HookBinding (fn, element) {
  this.element = element
  this.fn = fn
  this.bound = false
}

HookBinding.prototype = {
  bind: function () {
    if (!this.bound) {
      this._release = this.fn(this.element)
      this.bound = true
    }
  },
  unbind: function () {
    if (this.bound && typeof this._release === 'function') {
      this._release()
      this._release = null
      this.bound = false
    }
  }
}
