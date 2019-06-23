'use strict'

var trough = require('trough')
var mergeLandmarks = require('./merge-landmarks')
var mergeReferences = require('./merge-references')
var checkIfReferencedFilesExist = require('./check-files')
var validate = require('./validate')

module.exports = trough()
  .use(mergeLandmarks)
  .use(mergeReferences)
  .use(checkIfReferencedFilesExist)
  .use(validate)
