'use strict'

var fs = require('fs')
var path = require('path')
var URL = require('url').URL // Node 8 support
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

// List from: https://github.com/github/markup#markups
var readmeExtensions = ['.markdown', '.mdown', '.mkdn', '.md']
var readmeBasename = /^readme$/i

function find(ctx, next) {
  var file = ctx.file
  var fileSet = ctx.fileSet
  var absolute = file.path ? path.resolve(file.cwd, file.path) : ''
  var space = file.data
  var references = {}
  var landmarks = {}
  var actual = 0
  var expected = 0
  var statted = []
  var added = []
  var config = xtend(ctx.urlConfig, {
    path: absolute,
    base: absolute ? path.dirname(absolute) : file.cwd,
    root: ctx.root
  })

  space[constants.referenceId] = references
  space[constants.landmarkId] = landmarks

  addLandmarks(absolute, '')

  slugs.reset()

  visit(ctx.tree, mark)

  if (expected === 0) {
    next()
  }

  function mark(node) {
    var data = node.data || {}
    var props = data.hProperties || {}
    var id = props.name || props.id || data.id
    var info = node.url ? urlToPath(node.url, config) : null
    var fp
    var hash

    if (!id && node.type === 'heading') {
      id = slugs.slug(toString(node))
    }

    if (id) {
      addLandmarks(absolute, id)
    }

    if (info) {
      fp = info.filePath
      hash = info.hash

      addReference(fp, '', node)

      if (hash) {
        if (fileSet || fp === absolute) {
          addReference(fp, hash, node)
        }

        if (fileSet && fp && statted.indexOf(fp) === -1) {
          addFile(fp)
        }
      }
    }
  }

  function addLandmarks(filePath, hash) {
    addLandmark(filePath, hash)

    // Note: this may add marks too many anchors as defined.
    // For example, if there is both a `readme.md` and a `readme.markdown` in a
    // folder, both their landmarks will be defined for their parent folder.
    // To solve this, we could check whichever sorts first, and ignore the
    // others.
    // This is an unlikely scenario though, and adds a lot of complexity, so
    // we’re ignoring it.
    if (readme(filePath)) {
      addLandmark(path.dirname(filePath), hash)
    }
  }

  function addLandmark(filePath, hash) {
    var marks = landmarks[filePath] || (landmarks[filePath] = {})

    marks[hash] = true
  }

  function addReference(filePath, hash, node) {
    var refs = references[filePath] || (references[filePath] = {})
    var hashes = refs[hash] || (refs[hash] = [])

    hashes.push(node)
  }

  function addFile(fileOrFolderPath) {
    expected++

    statted.push(fileOrFolderPath)

    fs.stat(fileOrFolderPath, onstat)

    function onstat(_, stats) {
      if (stats && stats.isDirectory()) {
        fs.readdir(fileOrFolderPath, onreaddir)
      } else {
        done(fileOrFolderPath)
      }
    }

    function onreaddir(_, entries) {
      /* istanbul ignore next - unlikely that it is an unreadable directory. */
      var files = (entries || []).sort()
      var length = files.length
      var index = -1
      var entry
      var file
      var filePath

      while (++index < length) {
        entry = entries[index]

        if (readme(entry)) {
          file = entry
          break
        }
      }

      // If there is no readme that we can parse, add the directory.
      filePath = fileOrFolderPath

      // To do: test for no readme in directory.

      if (file) {
        filePath = path.join(fileOrFolderPath, file)
        statted.push(filePath)
      }

      done(filePath)
    }

    function done(filePath) {
      if (added.indexOf(filePath) === -1) {
        added.push(filePath)

        fileSet.add(
          vfile({cwd: file.cwd, path: path.relative(file.cwd, filePath)})
        )
      }

      actual++

      if (actual === expected) {
        next()
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
  } catch (_) {}

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
    value = value.split(slash).slice(1).join(slash)

    return normalize(path.resolve(config.root, value + url.hash), config)
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
    value = config.path ? config.path + value : value
  }
  // Anything else, such as `readme.md`.
  else {
    value = config.path ? path.resolve(config.base, value) : ''
  }

  return normalize(value, config)
}

function normalize(url, config) {
  var numberSignIndex = url.indexOf(numberSign)
  var lines = config.lines
  var prefix = config.headingPrefix
  var topAnchor = config.topAnchor
  var filePath
  var hash

  if (numberSignIndex === -1) {
    filePath = url
  } else {
    filePath = url.slice(0, numberSignIndex)
    hash = url.slice(numberSignIndex).toLowerCase()

    // Ignore the hash if it references the top anchor of the environment
    if (topAnchor && hash === topAnchor) {
      hash = undefined
    }
    // Ignore the hash if it references lines in a file or doesn’t start
    // with a heading prefix.
    else if (
      (lines && lineExpression.test(hash)) ||
      hash.slice(0, prefix.length) !== prefix
    ) {
      hash = undefined
    }
    // Use the hash if it starts with a heading prefix.
    else {
      hash = hash.slice(prefix.length)
    }
  }

  return {filePath: decodeURIComponent(filePath), hash: hash}
}

function readme(filePath) {
  var ext = path.extname(filePath)

  return (
    readmeExtensions.indexOf(ext) !== -1 &&
    readmeBasename.test(path.basename(filePath, ext))
  )
}
