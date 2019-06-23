'use strict'

var path = require('path')
var propose = require('propose')
var constants = require('../constants')

module.exports = validate

function validate(ctx) {
  var landmarks = ctx.landmarks
  var references = ctx.references
  var missing = []
  var reference
  var length
  var index

  for (reference in references) {
    if (!landmarks[reference]) {
      missing = missing.concat(references[reference])
    }
  }

  length = missing.length
  index = -1

  while (++index < length) {
    reference = missing[index]
    warn(ctx, reference.reference, reference.file, reference.nodes)
  }
}

function warn(ctx, reference, file, nodes) {
  var landmarks = ctx.landmarks
  var absolute = file.path ? path.resolve(file.cwd, file.path) : ''
  var base = absolute ? path.dirname(absolute) : null
  var relative = base ? path.relative(base, reference) : reference
  var pathname = relative
  var numberSignIndex = pathname.indexOf('#')
  var dictionary = []
  var subhash
  var subpathname
  var landmark
  var relativeLandmark
  var hash
  var reason
  var ruleId
  var origin
  var suggestion

  if (numberSignIndex !== -1) {
    hash = pathname.slice(numberSignIndex + 1)
    pathname = pathname.slice(0, numberSignIndex)
  }

  if (hash) {
    reason = 'Link to unknown heading'
    ruleId = constants.headingRuleId

    if (base && path.join(base, pathname) !== absolute) {
      reason += ' in `' + pathname + '`'
      ruleId = constants.headingInFileRuleId
    }

    reason += ': `' + hash + '`'
  } else {
    reason = 'Link to unknown file: `' + pathname + '`'
    ruleId = constants.fileRuleId
  }

  origin = [constants.sourceId, ruleId].join(':')

  for (landmark in landmarks) {
    if (landmarks[landmark]) {
      relativeLandmark = base ? path.relative(base, landmark) : landmark
      subpathname = relativeLandmark
      subhash = null
      numberSignIndex = subpathname.indexOf('#')

      if (numberSignIndex !== -1) {
        subhash = subpathname.slice(numberSignIndex + 1)
        subpathname = subpathname.slice(0, numberSignIndex)
      }

      if (subpathname === pathname) {
        if (subhash && hash) {
          dictionary.push(subhash)
        }
      } else if (!subhash && !hash) {
        dictionary.push(subpathname)
      }
    }
  }

  suggestion = propose(hash ? hash : pathname, dictionary, {threshold: 0.7})

  if (suggestion) {
    reason += '. Did you mean `' + suggestion + '`'
  }

  nodes.forEach(one)

  function one(node) {
    file.message(reason, node, origin)
  }
}
