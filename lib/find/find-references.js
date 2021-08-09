import fs from 'fs'
import path from 'path'
import {URL} from 'url'
import {toVFile} from 'to-vfile'
import {visit} from 'unist-util-visit'
import {toString} from 'mdast-util-to-string'
import BananaSlug from 'github-slugger'
import {constants} from '../constants.js'

const slugs = new BananaSlug()

const slash = '/'
const numberSign = '#'
const questionMark = '?'

const https = 'https:'
const http = 'http:'
const slashes = '//'

const lineExpression = /^#l\d/i

// List from: https://github.com/github/markup#markups
const readmeExtensions = new Set(['.markdown', '.mdown', '.mkdn', '.md'])
const readmeBasename = /^readme$/i

export function findReferences(ctx, next) {
  const file = ctx.file
  const fileSet = ctx.fileSet
  const absolute = file.path ? path.resolve(file.cwd, file.path) : ''
  const space = file.data
  const references = Object.create(null)
  const landmarks = Object.create(null)
  const statted = []
  const added = []
  const config = Object.assign({}, ctx.urlConfig, {
    path: absolute,
    base: absolute ? path.dirname(absolute) : file.cwd,
    root: ctx.root
  })
  let actual = 0
  let expected = 0

  space[constants.referenceId] = references
  space[constants.landmarkId] = landmarks

  addLandmarks(absolute, '')

  slugs.reset()

  visit(ctx.tree, mark)

  if (expected === 0) {
    next()
  }

  function mark(node) {
    const data = node.data || {}
    const props = data.hProperties || {}
    const info = node.url ? urlToPath(node.url, config, node.type) : null
    let id = props.name || props.id || data.id

    if (!id && node.type === 'heading') {
      id = slugs.slug(toString(node))
    }

    if (id) {
      addLandmarks(absolute, id)
    }

    if (info) {
      const fp = info.filePath
      const hash = info.hash

      addReference(fp, '', node)

      if (hash) {
        if (fileSet || fp === absolute) {
          addReference(fp, hash, node)
        }

        if (fileSet && fp && !statted.includes(fp)) {
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
    const marks =
      filePath in landmarks
        ? landmarks[filePath]
        : (landmarks[filePath] = Object.create(null))

    marks[hash] = true
  }

  function addReference(filePath, hash, node) {
    const refs =
      filePath in references
        ? references[filePath]
        : (references[filePath] = Object.create(null))
    const hashes = hash in refs ? refs[hash] : (refs[hash] = [])

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
      // Unlikely that it is an unreadable directory.
      /* c8 ignore next */
      const files = (entries || []).sort()
      let index = -1
      let file

      while (++index < files.length) {
        const entry = entries[index]

        if (readme(entry)) {
          file = entry
          break
        }
      }

      // If there is no readme that we can parse, add the directory.
      let filePath = fileOrFolderPath

      // To do: test for no readme in directory.

      if (file) {
        filePath = path.join(fileOrFolderPath, file)
        statted.push(filePath)
      }

      done(filePath)
    }

    function done(filePath) {
      if (!added.includes(filePath)) {
        added.push(filePath)

        fileSet.add(
          toVFile({cwd: file.cwd, path: path.relative(file.cwd, filePath)})
        )
      }

      actual++

      if (actual === expected) {
        next()
      }
    }
  }
}

// eslint-disable-next-line complexity
function urlToPath(value, config, type) {
  // Absolute paths: `/wooorm/test/blob/main/directory/example.md`.
  if (value.charAt(0) === slash) {
    if (!config.hostname) {
      return
    }

    // Create a URL.
    value = https + slashes + config.hostname + value
  }

  let url

  try {
    url = new URL(value)
  } catch {}

  // URLs: `https://github.com/wooorm/test/blob/main/directory/example.md`.
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

    return normalize(
      path.resolve(config.root, value + (type === 'image' ? '' : url.hash)),
      config
    )
  }

  // Remove the search: `?foo=bar`.
  // But don’t remove stuff if it’s in the hash: `readme.md#heading?`.
  let numberSignIndex = value.indexOf(numberSign)
  const questionMarkIndex = value.indexOf(questionMark)

  if (
    questionMarkIndex !== -1 &&
    (numberSignIndex === -1 || numberSignIndex > questionMarkIndex)
  ) {
    value =
      value.slice(0, questionMarkIndex) +
      (numberSignIndex === -1 ? '' : value.slice(numberSignIndex))
    numberSignIndex = value.indexOf(numberSign)
  }

  // Ignore "headings" in image links: `image.png#metadata`
  if (numberSignIndex !== -1 && type === 'image') {
    value = value.slice(0, numberSignIndex)
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
  const numberSignIndex = url.indexOf(numberSign)
  const lines = config.lines
  const prefix = config.headingPrefix
  const topAnchor = config.topAnchor
  let filePath
  let hash

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

  return {filePath: decodeURIComponent(filePath), hash}
}

function readme(filePath) {
  const ext = path.extname(filePath)

  return (
    readmeExtensions.has(ext) &&
    readmeBasename.test(path.basename(filePath, ext))
  )
}
