var isObservable = require('../is-observable')
var Set = require('../set')
var watch = require('../watch')
var caches = new global.WeakMap()

module.exports = applyProperties

function applyProperties (target, properties, namespace) {
  var data = caches.get(target)
  if (!data) {
    data = { releases: [] }
    caches.set(target, data)
  }

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
        var styleValue = resolve(value[k])
        var styleObs = isObservable(value[k]) ? value[k] : null
        target.style.setProperty(k, styleValue)

        if (styleObs) {
          data.releases.push(bindStyle(target, styleObs, k))
        }
      }
    } else if (key === 'attributes') {
      for (var k in value) {
        var attrValue = resolve(value[k])
        var attrObs = isObservable(value[k]) ? value[k] : null

        if (namespace) {
          target.setAttributeNS(namespace, k, attrValue)
        } else {
          target.setAttribute(k, attrValue)
        }

        if (attrObs) {
          data.releases.push(bindAttr(target, attrObs, k, namespace))
        }
      }
    } else if (key === 'events') {
      for (var name in value) {
        target.addEventListener(name, value[name], true)
      }
    } else if (key.slice(0, 3) === 'ev-') {
      target.addEventListener(key.slice(3), value, true)
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
        data.releases.push(bind(target, obs, key))
      }
    }
  }

  watch(classList, function (value) {
    value = [].concat.apply([], value).filter(present).join(' ')
    if (value || target.className) {
      target.className = value
    }
  })
}

applyProperties.destroy = function (target) {
  var data = caches.get(target)
  if (data) {
    while (data.releases.length) {
      data.releases.pop()()
    }
    caches.delete(target)
  }
}

function bindStyle (target, styleObs, key) {
  return styleObs(function (value) {
    target.style.setProperty(key, value)
  })
}

function bindAttr (target, attrObs, key, namespace) {
  return attrObs(function (value) {
    if (value == null) {
      if (namespace) {
        target.removeAttributeNS(namespace, key)
      } else {
        target.removeAttribute(key)
      }
    } else {
      if (namespace) {
        target.setAttributeNS(namespace, key, value)
      } else {
        target.setAttribute(key, value)
      }
    }
  })
}

function bind (target, obs, key, namespace) {
  return obs(function (toValue) {
    var fromValue = namespace
      ? target.getAttributeNS(namespace, key)
      : target.getAttribute(key)

    if (fromValue !== toValue) {
      if (namespace) {
        target.setAttributeNS(namespace, key, toValue)
      } else {
        target.setAttribute(key, toValue)
      }
    }
  })
}

function present (val) {
  return val != null
}

function resolve (source) {
  return typeof source === 'function' ? source() : source
}
