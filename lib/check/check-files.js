'use strict'

var fs = require('fs')

module.exports = checkIfReferencedFilesExist

function checkIfReferencedFilesExist(ctx, next) {
  var landmarks = ctx.landmarks
  var references = ctx.references
  var filePaths = []
  var filePath
  var actual = 0
  var expected

  for (filePath in references) {
    if (landmarks[filePath] === undefined) {
      filePaths.push(filePath)
    }
  }

  expected = filePaths.length

  if (expected === 0) {
    next()
  } else {
    filePaths.forEach(checkIfExists)
  }

  function checkIfExists(filePath) {
    fs.access(filePath, fs.F_OK, onaccess)

    function onaccess(err) {
      var noEntry = err && (err.code === 'ENOENT' || err.code === 'ENOTDIR')

      landmarks[filePath] = {'': !noEntry}

      if (++actual === expected) {
        next()
      }
    }
  }
}
