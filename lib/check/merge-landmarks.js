'use strict'

var constants = require('../constants')

module.exports = mergeLandmarks

function mergeLandmarks(ctx) {
  var result = Object.create(null)
  var files = ctx.files
  var length = files.length
  var index = -1
  var file
  var landmarks
  var landmark

  while (++index < length) {
    file = files[index]
    landmarks = file.data[constants.landmarkId]

    if (landmarks) {
      for (landmark in landmarks) {
        result[landmark] = Object.assign(
          Object.create(null),
          landmarks[landmark]
        )
      }
    }
  }

  ctx.landmarks = result
}
