var applyProperties = require('./lib/apply-properties')
var isObservable = require('./is-observable')
var parseTag = require('./lib/parse-tag')
var walk = require('./lib/walk')
var watch = require('./watch')
var caches = new global.WeakMap()
var watcher = null

module.exports = function (tag, attributes, children) {
  return Element(global.document, null, tag, attributes, children)
}

module.exports.forDocument = function (document, namespace) {
  return Element.bind(this, document, namespace)
}

function Element (document, namespace, tagName, properties, children) {
  if (!children && (Array.isArray(properties) || isText(properties))) {
    children = properties
    properties = null
  }

  checkWatcher(document)
  properties = properties || {}

  var tag = parseTag(tagName, properties, namespace)
  var node = namespace
    ? document.createElementNS(namespace, tag.tagName)
    : document.createElement(tag.tagName)

  if (tag.id) {
    node.id = tag.id
  }

  if (tag.classes && tag.classes.length) {
    node.className = tag.classes.join(' ')
  }

  var data = {
    targets: new Map(),
    bindings: []
  }

  caches.set(node, data)
  applyProperties(node, properties, data)
  if (children != null) {
    appendChild(document, node, data, children)
  }

  return node
}

function appendChild (document, target, data, node) {
  if (Array.isArray(node)) {
    node.forEach(function (child) {
      appendChild(document, target, data, child)
    })
  } else if (isObservable(node)) {
    var nodes = getNodes(document, resolve(node))
    nodes.forEach(append, target)
    data.targets.set(node, nodes)
    data.bindings.push(new Binding(bind, document, node, data))
  } else {
    node = getNode(document, node)
    target.appendChild(node)
    walk(node, rebind)
  }
}

function append (child) {
  this.appendChild(child)
  walk(child, rebind)
}

function checkWatcher (document) {
  if (!watcher && global.MutationObserver) {
    watcher = new global.MutationObserver(onMutate)
    watcher.observe(document, {subtree: true, childList: true})
  }
}

function onMutate (changes) {
  changes.forEach(handleChange)
}

function handleChange (change) {
  for (var i = 0; i < change.addedNodes.length; i++) {
    // if parent is a mutant element, then safe to assume it has already been bound
    var node = change.addedNodes[i]
    if (!caches.has(node.parentNode)) {
      walk(node, rebind)
    }
  }
  for (var i = 0; i < change.removedNodes.length; i++) {
    // if has already been unbound, safe to assume children have also
    var node = change.removedNodes[i]
    var data = caches.get(node)
    if (data && data.bound) {
      walk(node, unbind)
    }
  }
}

function bind (document, obs, data) {
  return watch(obs, function (value) {
    var oldNodes = data.targets.get(obs)
    var newNodes = getNodes(document, value)
    if (oldNodes) {
      replace(oldNodes, newNodes)
      data.targets.set(obs, newNodes)
    }
  })
}

function indexOf (target, item) {
  return Array.prototype.indexOf.call(target, item)
}

function replace (oldNodes, newNodes) {
  var parent = oldNodes[oldNodes.length - 1].parentNode
  var nodes = parent.childNodes
  var startIndex = indexOf(nodes, oldNodes[0])

  // avoid reinserting nodes that are already in correct position!
  for (var i = 0; i < newNodes.length; i++) {
    if (nodes[i + startIndex] === newNodes[i]) {
      continue
    } else if (nodes[i + startIndex + 1] === newNodes[i]) {
      parent.removeChild(nodes[i + startIndex])
      continue
    } else if (nodes[i + startIndex] === newNodes[i + 1] && newNodes[i + 1]) {
      parent.insertBefore(newNodes[i], nodes[i + startIndex])
    } else if (nodes[i + startIndex]) {
      parent.insertBefore(newNodes[i], nodes[i + startIndex])
    } else {
      parent.appendChild(newNodes[i])
    }
    walk(newNodes[i], rebind)
  }

  oldNodes.filter(function (node) {
    return !~newNodes.indexOf(node)
  }).forEach(function (node) {
    if (node.parentNode) {
      parent.removeChild(node)
    }
    walk(node, unbind)
  })
}

function isText (value) {
  return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
}

function getNode (document, nodeOrText) {
  if (nodeOrText == null) {
    return document.createTextNode('')
  } else if (isText(nodeOrText)) {
    return document.createTextNode(nodeOrText.toString())
  } else {
    return nodeOrText
  }
}

function getNodes (document, nodeOrNodes) {
  if (Array.isArray(nodeOrNodes)) {
    if (nodeOrNodes.length) {
      var result = []
      for (var i = 0; i < nodeOrNodes.length; i++) {
        var item = nodeOrNodes[i]
        if (Array.isArray(item)) {
          getNodes(document, item).forEach(push, result)
        } else {
          result.push(getNode(document, item))
        }
      }
      return result.map(getNode.bind(this, document))
    } else {
      return [getNode(document, null)]
    }
  } else {
    return [getNode(document, nodeOrNodes)]
  }
}

function rebind (node) {
  if (node.nodeType === 1) {
    var data = caches.get(node)
    if (data) {
      data.bindings.forEach(invokeBind)
    }
  }
}

function unbind (node) {
  if (node.nodeType === 1) {
    var data = caches.get(node)
    if (data) {
      data.bindings.forEach(invokeUnbind)
    }
  }
}

function invokeBind (binding) {
  binding.bind()
}

function invokeUnbind (binding) {
  binding.unbind()
}

function push (item) {
  this.push(item)
}

function resolve (source) {
  return typeof source === 'function' ? source() : source
}

function Binding (fn, document, obs, data) {
  this.document = document
  this.obs = obs
  this.data = data
  this.fn = fn
  this.bound = false
}

Binding.prototype = {
  bind: function () {
    if (!this.bound) {
      this._release = this.fn(this.document, this.obs, this.data)
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
