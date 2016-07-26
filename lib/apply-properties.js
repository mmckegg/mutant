var isObservable = require('../is-observable')
var Set = require('../set')
var watch = require('../watch')

module.exports = applyProperties

function applyProperties (target, properties, data) {
  var classList = Set()
  if (target.className) {
    classList.add(target.className)
  }

  for (var key in properties) {
    var valueOrObs = properties[key]
    var value = resolve(valueOrObs)

    if (key === 'style') {
      // TODO: handle observable at root for style objects
      for (var k in value) {
        var styleObs = isObservable(value[k]) ? value[k] : null
        if (styleObs) {
          data.bindings.push(new Binding(bindStyle, target, styleObs, k))
        } else {
          target.style.setProperty(k, value[k])
        }
      }
    } else if (key === 'hooks') {
      if (Array.isArray(value)) {
        value.forEach(function (v) {
          data.bindings.push(new HookBinding(v, target))
        })
      }
    } else if (key === 'attributes') {
      for (var k in value) {
        var attrObs = isObservable(value[k]) ? value[k] : null
        if (attrObs) {
          data.bindings.push(new Binding(bindAttr, target, attrObs, k))
        } else {
          target.setAttribute(k, value[k])
        }
      }
    } else if (key === 'events') {
      for (var name in value) {
        target.addEventListener(name, value[name], false)
      }
    } else if (key.slice(0, 3) === 'ev-') {
      target.addEventListener(key.slice(3), value, false)
    } else if (key === 'className' || key === 'classList') {
      if (Array.isArray(valueOrObs)) {
        valueOrObs.forEach(function (v) {
          classList.add(v)
        })
      } else {
        classList.add(valueOrObs)
      }
    } else {
      target[key] = value
      var obs = isObservable(valueOrObs) ? valueOrObs : null
      if (obs) {
        data.bindings.push(new Binding(bind, target, obs, key))
      }
    }
  }

  if (classList.getLength()) {
    data.bindings.push(new Binding(bindClassList, target, classList, 'className'))
  }
}

function bindClassList (target, obs, key) {
  return watch(obs, function (value) {
    value = [].concat.apply([], value).filter(present).join(' ')
    if (value || target[key]) {
      target[key] = value
    }
  })
}

function bindStyle (target, styleObs, key) {
  return watch(styleObs, function (value) {
    target.style.setProperty(key, value)
  })
}

function bindAttr (target, attrObs, key) {
  return watch(attrObs, function (value) {
    if (value == null) {
      target.removeAttribute(key)
    } else {
      target.setAttribute(key, value)
    }
  })
}

function bind (target, obs, key) {
  return watch(obs, function (toValue) {
    var fromValue = target.getAttribute(key)
    if (fromValue !== toValue) {
      target.setAttribute(key, toValue)
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
