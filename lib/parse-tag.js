// FROM: https://raw.githubusercontent.com/Matt-Esch/virtual-dom/master/virtual-hyperscript/parse-tag.js

'use strict'

var split = require('browser-split')

var classIdSplit = /([\.#]?[a-zA-Z0-9\u007F-\uFFFF_:-]+)/
var notClassId = /^\.|#/

module.exports = parseTag

function parseTag (tag, attributes, namespace) {
  if (!tag) {
    return 'DIV'
  }

  var noId = !(attributes.hasOwnProperty('id'))

  var tagParts = split(tag, classIdSplit)
  var tagName = null

  if (notClassId.test(tagParts[1])) {
    tagName = 'DIV'
  }

  var classes, part, type, i, id

  for (i = 0; i < tagParts.length; i++) {
    part = tagParts[i]

    if (!part) {
      continue
    }

    type = part.charAt(0)

    if (!tagName) {
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
