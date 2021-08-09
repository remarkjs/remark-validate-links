import {constants} from '../constants.js'

const own = {}.hasOwnProperty

export function mergeReferences(ctx) {
  const result = {}
  const files = ctx.files
  let index = -1

  while (++index < files.length) {
    const file = files[index]
    const references = file.data[constants.referenceId]
    let reference

    if (!references) {
      continue
    }

    for (reference in references) {
      if (own.call(references, reference)) {
        const internal = references[reference]
        const all =
          reference in result
            ? result[reference]
            : (result[reference] = Object.create(null))
        let hash

        for (hash in internal) {
          // eslint-disable-next-line max-depth
          if (own.call(internal, hash)) {
            ;(all[hash] || (all[hash] = [])).push({
              file,
              reference: {filePath: reference, hash},
              nodes: internal[hash]
            })
          }
        }
      }
    }
  }

  ctx.references = result
}
