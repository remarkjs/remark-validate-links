'use strict'

var vfileSort = require('vfile-sort')

module.exports = sort

function sort() {
  return transform
}

function transform(tree, file) {
  vfileSort(file)
}
