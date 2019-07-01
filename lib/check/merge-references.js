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
  var all
  var internal
  var hash

  while (++index < length) {
    file = files[index]
    references = file.data[constants.referenceId]

    if (!references) {
      continue
    }

    for (reference in references) {
      internal = references[reference]
      all = result[reference] || (result[reference] = {})

      for (hash in internal) {
        ;(all[hash] || (all[hash] = [])).push({
          file: file,
          reference: {filePath: reference, hash: hash},
          nodes: internal[hash]
        })
      }
    }
  }

  ctx.references = result
}
