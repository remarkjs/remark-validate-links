'use strict'

var xtend = require('xtend')
var check = require('./check')
var find = require('./find')
var constants = require('./constants')

module.exports = validateLinks

cliCompleter.pluginId = constants.sourceId

function validateLinks(options, fileSet) {
  var settings = options || {}

  // Attach a `completer`.
  if (fileSet) {
    fileSet.use(cliCompleter)
  }

  return transformer

  // Find references and landmarks.
  function transformer(tree, file, next) {
    find.run(xtend(settings, {tree: tree, file: file, fileSet: fileSet}), done)

    function done(err) {
      if (err) {
        next(err)
      } else if (fileSet) {
        next()
      } else {
        checkAll([file], next)
      }
    }
  }
}

// Completer for the CLI (multiple files, supports parsing more files).
function cliCompleter(set, next) {
  checkAll(set.valueOf(), next)
}

function checkAll(files, next) {
  // Check all references and landmarks.
  check.run({files: files}, function (err) {
    next(err)
  })
}
