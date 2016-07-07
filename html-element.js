var applyProperties = require('./lib/apply-properties')
var isObservable = require('./is-observable')
var parseTag = require('./lib/parse-tag')
var caches = new global.WeakMap()

module.exports = function (tag, attributes, children) {
  return Element(global.document, null, tag, attributes, children)
}

module.exports.forDocument = function (document, namespace) {
  return Element.bind(this, document, namespace)
}

module.exports.destroy = function (node) {
  var data = caches.get(node)
  if (data) {
    Array.from(data.releases.values()).forEach(tryInvoke)
    caches.delete(node)
  }
  applyProperties.destroy(node)
}

function Element (document, namespace, tagName, properties, children) {
  if (!children && (Array.isArray(properties) || isText(properties))) {
    children = properties
    properties = null
  }

  properties = properties || {}

  var tag = parseTag(tagName, properties, namespace)
  var node = namespace
    ? document.createElementNS(namespace, tag.tagName)
    : document.createElement(tag.tagName)

  if (!namespace) {
    if (tag.id) {
      node.id = tag.id
    }
    if (tag.classes && tag.classes.length) {
      node.className = tag.classes.join(' ')
    }
  }

  var data = {
    targets: new Map(),
    releases: new Map()
  }

  caches.set(node, data)
  applyProperties(node, properties, namespace)
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
    data.releases.set(node, bind(document, node, data))
  } else {
    target.appendChild(getNode(document, node))
  }
}

function append (child) {
  this.appendChild(child)
}

function bind (document, obs, data) {
  return obs(function (value) {
    var oldNodes = data.targets.get(obs)
    var newNodes = getNodes(document, value)
    if (oldNodes) {
      replace(oldNodes, newNodes)
      data.targets.set(obs, newNodes)
    }
  })
}

function replace (oldNodes, newNodes) {
  var parent = oldNodes[oldNodes.length - 1].parentNode
  var marker = oldNodes[oldNodes.length - 1].nextSibling
  oldNodes.filter(function (node) {
    return !~newNodes.indexOf(node)
  }).forEach(function (node) {
    parent.removeChild(node)
  })
  if (marker) {
    newNodes.forEach(function (node) {
      parent.insertBefore(node, marker)
    })
  } else {
    newNodes.forEach(function (node) {
      parent.appendChild(node)
    })
  }
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
      nodeOrNodes.forEach(function (item) {
        if (Array.isArray(item)) {
          getNodes(document, item).forEach(push, result)
        } else {
          result.push(getNode(document, item))
        }
      })
      return result.map(getNode.bind(this, document))
    } else {
      return [getNode(document, null)]
    }
  } else {
    return [getNode(document, nodeOrNodes)]
  }
}

function push (item) {
  this.push(item)
}

function resolve (source) {
  return typeof source === 'function' ? source() : source
}

function tryInvoke (func) {
  if (typeof func === 'function') {
    func()
  }
}
