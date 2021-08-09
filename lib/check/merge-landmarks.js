import {constants} from '../constants.js'

const own = {}.hasOwnProperty

export function mergeLandmarks(ctx) {
  const result = Object.create(null)
  const files = ctx.files
  let index = -1

  while (++index < files.length) {
    const file = files[index]
    const landmarks = file.data[constants.landmarkId]
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
