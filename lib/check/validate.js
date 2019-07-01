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
  var hash
  var refs
  var lands
  var length
  var index

  for (reference in references) {
    refs = references[reference]
    /* istanbul ignore next - `else` could happen in browser. */
    lands = landmarks[reference] || {}

    for (hash in refs) {
      if (!lands[hash]) {
        missing = missing.concat(refs[hash])
      }
    }
  }

  length = missing.length
  index = -1

  while (++index < length) {
    reference = missing[index]
    warn(ctx, reference.reference, reference.file, reference.nodes)
  }
}

function warn(ctx, info, file, nodes) {
  var landmarks = ctx.landmarks
  var absolute = file.path ? path.resolve(file.cwd, file.path) : ''
  var base = absolute ? path.dirname(absolute) : null
  var filePath = base ? path.relative(base, info.filePath) : info.filePath
  var hash = info.hash
  var dictionary = []
  var subhash
  var landmark
  var relativeLandmark
  var reason
  var ruleId
  var origin
  var suggestion

  if (hash) {
    reason = 'Link to unknown heading'
    ruleId = constants.headingRuleId

    if (base && path.join(base, filePath) !== absolute) {
      reason += ' in `' + filePath + '`'
      ruleId = constants.headingInFileRuleId
    }

    reason += ': `' + hash + '`'
  } else {
    reason = 'Link to unknown file: `' + filePath + '`'
    ruleId = constants.fileRuleId
  }

  origin = [constants.sourceId, ruleId].join(':')

  for (landmark in landmarks) {
    // Only suggest if file exists.
    if (!landmarks[landmark] || !landmarks[landmark]['']) {
      continue
    }

    relativeLandmark = base ? path.relative(base, landmark) : landmark

    if (!hash) {
      dictionary.push(relativeLandmark)
      continue
    }

    if (relativeLandmark !== filePath) {
      continue
    }

    for (subhash in landmarks[landmark]) {
      if (subhash !== '') {
        dictionary.push(subhash)
      }
    }
  }

  suggestion = propose(hash ? hash : filePath, dictionary, {threshold: 0.7})

  if (suggestion) {
    reason += '. Did you mean `' + suggestion + '`'
  }

  nodes.forEach(one)

  function one(node) {
    file.message(reason, node, origin)
  }
}
