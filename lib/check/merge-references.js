import {constants} from '../constants.js'

export function mergeReferences(ctx) {
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
      all =
        reference in result
          ? result[reference]
          : (result[reference] = Object.create(null))

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
