// FROM: https://raw.githubusercontent.com/Matt-Esch/virtual-dom/master/virtual-hyperscript/parse-tag.js

'use strict'

var split = require('browser-split')

var classIdSplit = /([\.#]?[a-zA-Z0-9\u007F-\uFFFF_:-]+)/
var classOrId = /^(\.|#)/
var mcssClass = /^(\-|[A-Z])/

module.exports = parseTag

function parseTag (tag, attributes, namespace) {
  var noId = !(attributes.hasOwnProperty('id'))

  var tagParts = split(tag, classIdSplit)
  var tagName = null

  if (classOrId.test(tagParts[1]) || mcssClass.test(tagParts[1])) {
    tagName = 'div'
  }

  var classes, part, type, i, id

  for (i = 0; i < tagParts.length; i++) {
    part = tagParts[i]

    if (!part) {
      continue
    }

    type = part.charAt(0)

    if (mcssClass.test(part)) {
      // handle micro-css style classes
      classes = classes || []
      classes.push(part)
    } else if (!tagName) {
      tagName = part
    } else if (type === '.') {
      classes = classes || []
      classes.push(part.substring(1, part.length))
    } else if (type === '#' && noId) {
      id = part.substring(1, part.length)
    }
  }

  return {
    tagName: namespace ? tagName : tagName.toUpperCase(),
    classes: classes,
    id: id
  }
}

function isUpperCase (text) {
  if (typeof text === 'string' && text) {
    return text.toUpperCase() === text
  }
}
