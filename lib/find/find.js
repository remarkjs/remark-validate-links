'use strict'

var path = require('path')
var vfile = require('to-vfile')
var visit = require('unist-util-visit')
var toString = require('mdast-util-to-string')
var xtend = require('xtend')
var slugs = require('github-slugger')()
var constants = require('../constants')

module.exports = find

var slash = '/'
var numberSign = '#'
var questionMark = '?'

var https = 'https:'
var http = 'http:'
var slashes = '//'

var lineExpression = /^#l\d/i

function find(ctx) {
  var file = ctx.file
  var fileSet = ctx.fileSet
  var absolute = file.path ? path.resolve(file.cwd, file.path) : ''
  var space = file.data
  var references = {}
  var landmarks = {}
  var alreadyAdded = []
  var config = xtend(ctx.urlConfig, {
    path: absolute,
    base: absolute ? path.dirname(absolute) : file.cwd,
    root: ctx.root
  })

  space[constants.referenceId] = references
  space[constants.landmarkId] = landmarks

  landmarks[absolute] = true

  slugs.reset()

  visit(ctx.tree, mark)

  // eslint-disable-next-line complexity
  function mark(node) {
    var data = node.data || {}
    var props = data.hProperties || {}
    var id = props.name || props.id || data.id
    var filePath = node.url ? urlToPath(node.url, config) : null
    var numberSignIndex
    var refs
    var fp
    var hash

    if (!id && node.type === 'heading') {
      id = slugs.slug(toString(node))
    }

    if (id) {
      landmarks[absolute + numberSign + id] = true
    }

    if (filePath) {
      numberSignIndex = filePath.indexOf(numberSign)
      fp = filePath

      if (numberSignIndex !== -1) {
        fp = filePath.slice(0, numberSignIndex)
        hash = filePath.slice(numberSignIndex).toLowerCase()

        // Ignore the hash if it references lines in a file or doesn’t start
        // with a heading prefix.
        if (
          (config.lines && lineExpression.test(hash)) ||
          hash.slice(0, config.headingPrefix.length) !== config.headingPrefix
        ) {
          numberSignIndex = -1
        }
        // Use the hash if it starts with a heading prefix.
        else {
          filePath = fp + numberSign + hash.slice(config.headingPrefix.length)
        }
      }

      refs = references[fp] || (references[fp] = [])
      refs.push(node)

      // With a heading
      if (numberSignIndex !== -1) {
        // Add with heading.
        if (fileSet || fp === absolute) {
          refs = references[filePath] || (references[filePath] = [])
          refs.push(node)
        }

        if (
          fileSet &&
          alreadyAdded.indexOf(fp) === -1 &&
          numberSignIndex !== 0
        ) {
          alreadyAdded.push(fp)
          fileSet.add(vfile({cwd: file.cwd, path: path.relative(file.cwd, fp)}))
        }
      }
    }
  }
}

function urlToPath(value, config) {
  var url
  var questionMarkIndex
  var numberSignIndex

  // Absolute paths: `/wooorm/test/blob/master/directory/example.md`.
  if (value.charAt(0) === slash) {
    if (!config.hostname) {
      return
    }

    // Create a URL.
    value = https + slashes + config.hostname + value
  }

  try {
    url = new URL(value)
  } catch (error) {}

  // URLs: `https://github.com/wooorm/test/blob/master/directory/example.md`.
  if (url) {
    // Exit if we don’t have hosted Git info or this is not a URL to the repo.
    if (
      !config.prefix ||
      !config.hostname ||
      (url.protocol !== https && url.protocol !== http) ||
      url.hostname !== config.hostname ||
      url.pathname.slice(0, config.prefix.length) !== config.prefix
    ) {
      return
    }

    value = url.pathname.slice(config.prefix.length)

    // Things get interesting here: branches: `foo/bar/baz` could be `baz` on
    // the `foo/bar` branch, or, `baz` in the `bar` directory on the `foo`
    // branch.
    // Currently, we’re ignoring this and just not supporting branches.
    value = value
      .split(slash)
      .slice(1)
      .join(slash)

    return path.resolve(config.root, value + url.hash)
  }

  // Remove the search: `?foo=bar`.
  // But don’t remove stuff if it’s in the hash: `readme.md#heading?`.
  numberSignIndex = value.indexOf(numberSign)
  questionMarkIndex = value.indexOf(questionMark)

  if (
    questionMarkIndex !== -1 &&
    (numberSignIndex === -1 || numberSignIndex > questionMarkIndex)
  ) {
    value =
      value.slice(0, questionMarkIndex) +
      (numberSignIndex === -1 ? '' : value.slice(numberSignIndex))
  }

  // Local: `#heading`.
  if (value.charAt(0) === numberSign) {
    return config.path ? config.path + value : value
  }

  // Anything else, such as `readme.md`.
  return config.path ? path.resolve(config.base, value) : ''
}
