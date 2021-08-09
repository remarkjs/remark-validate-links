/**
 * @typedef {import('../types.js').VFile} VFile
 * @typedef {import('../types.js').Landmarks} Landmarks
 * @typedef {import('../types.js').References} References
 */

import {constants, promises as fs} from 'node:fs'

/**
 * @param {{files: VFile[], landmarks: Landmarks, references: References}} ctx
 */
export async function checkFiles(ctx) {
  const landmarks = ctx.landmarks
  const references = ctx.references
  /** @type {Array.<Promise<void>>} */
  const promises = []
  /** @type {string} */
  let filePath

  for (filePath in references) {
    if (landmarks[filePath] === undefined) {
      /** @type {Record<string, boolean>} */
      const map = Object.create(null)

      landmarks[filePath] = map

      promises.push(
        fs.access(filePath, constants.F_OK).then(
          () => {
            map[''] = true
          },
          (/** @type {NodeJS.ErrnoException} */ error) => {
            map[''] = error.code !== 'ENOENT' && error.code !== 'ENOTDIR'
          }
        )
      )
    }
  }

  await Promise.all(promises)
}
