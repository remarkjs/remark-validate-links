/**
 * @typedef {import('../types.js').VFile} VFile
 * @typedef {import('../types.js').Landmarks} Landmarks
 * @typedef {import('../types.js').References} References
 * @typedef {import('../types.js').ReferenceMap} ReferenceMap
 * @typedef {import('../types.js').Resource} Resource
 */

import {constants} from '../constants.js'

const own = {}.hasOwnProperty

/**
 * @param {{files: VFile[], landmarks: Landmarks, references?: References}} ctx
 */
export function mergeReferences(ctx) {
  /** @type {References} */
  const result = {}
  const files = ctx.files
  let index = -1

  while (++index < files.length) {
    const file = files[index]
    const references =
      /** @type {Record<string, Record<string, Resource[]>>|undefined} */ (
        file.data[constants.referenceId]
      )
    /** @type {string} */
    let reference

    if (!references) {
      continue
    }

    for (reference in references) {
      if (own.call(references, reference)) {
        const internal = references[reference]
        /** @type {Record<string, ReferenceMap[]>} */
        const all =
          reference in result
            ? result[reference]
            : (result[reference] = Object.create(null))
        /** @type {string} */
        let hash

        for (hash in internal) {
          // eslint-disable-next-line max-depth
          if (own.call(internal, hash)) {
            const list = all[hash] || (all[hash] = [])
            list.push({
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
