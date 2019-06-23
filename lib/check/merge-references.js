'use strict'

var constants = require('../constants')

module.exports = mergeReferences

function mergeReferences(ctx) {
  var result = {}
  var files = ctx.files
  var length = files.length
  var index = -1
  var file
  var references
  var reference

  while (++index < length) {
    file = files[index]
    references = file.data[constants.referenceId]

    if (!references) {
      continue
    }

    for (reference in references) {
      if (!(reference in result)) {
        result[reference] = []
      }

      result[reference].push({
        file: file,
        reference: reference,
        nodes: references[reference]
      })
    }
  }

  ctx.references = result
}
