/**
 * @typedef {import('../types.js').VFile} VFile
 * @typedef {import('../types.js').Landmarks} Landmarks
 */

import {constants} from '../constants.js'

const own = {}.hasOwnProperty

/**
 * @param {{files: VFile[], landmarks?: Landmarks}} ctx
 */
export function mergeLandmarks(ctx) {
  /** @type {Landmarks} */
  const result = Object.create(null)
  const files = ctx.files
  let index = -1

  while (++index < files.length) {
    const file = files[index]
    const landmarks = /** @type {Landmarks|undefined} */ (
      file.data[constants.landmarkId]
    )
    /** @type {string} */
    let landmark

    if (landmarks) {
      for (landmark in landmarks) {
        if (own.call(landmarks, landmark)) {
          result[landmark] = Object.assign(
            Object.create(null),
            landmarks[landmark]
          )
        }
      }
    }
  }

  ctx.landmarks = result
}
