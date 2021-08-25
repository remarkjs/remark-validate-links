/**
 * @typedef {import('mdast').Root} Root
 * @typedef {import('hast').Properties} Properties
 * @typedef {import('vfile').VFile} VFile
 * @typedef {import('unified-engine').FileSet} FileSet
 * @typedef {import('../types.js').Landmarks} Landmarks
 * @typedef {import('../types.js').References} References
 * @typedef {import('../types.js').ReferenceMap} ReferenceMap
 * @typedef {import('../types.js').Resource} Resource
 * @typedef {import('../index.js').UrlConfig} UrlConfig
 * @typedef {import('../index.js').Options} Options
 */

import {promises as fs} from 'node:fs'
import path from 'node:path'
import {URL} from 'node:url'
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

/**
 * @param {{tree: Root, file: VFile, fileSet?: FileSet, options: Options}} ctx
 */
export async function findReferences(ctx) {
  const file = ctx.file
  const fileSet = ctx.fileSet
  const absolute = file.path ? path.resolve(file.cwd, file.path) : ''
  const space = file.data
  /** @type {Record<string, Record<string, Resource[]>>} */
  const references = Object.create(null)
  /** @type {Landmarks} */
  const landmarks = Object.create(null)
  const config = {
    // Always set at this point.
    /* c8 ignore next */
    urlConfig: ctx.options.urlConfig || {},
    path: absolute,
    base: absolute ? path.dirname(absolute) : file.cwd,
    root: ctx.options.root
  }
  /** @type {string[]} */
  const statted = []
  /** @type {string[]} */
  const added = []
  /** @type {Array.<Promise<void>>} */
  const promises = []

  space[constants.referenceId] = references
  space[constants.landmarkId] = landmarks

  addLandmarks(absolute, '')

  slugs.reset()

  visit(ctx.tree, (node) => {
    const data = node.data || {}
    const props = /** @type {Properties} */ (data.hProperties || {})
    let id = String(props.name || props.id || data.id || '')

    if (!id && node.type === 'heading') {
      id = slugs.slug(toString(node, {includeImageAlt: false}))
    }

    if (id) {
      addLandmarks(absolute, id)
    }

    if ('url' in node && node.url) {
      const info = urlToPath(node.url, config, node.type)

      if (info) {
        const fp = info.filePath
        const hash = info.hash

        addReference(fp, '', node)

        if (hash) {
          if (fileSet || fp === absolute) {
            addReference(fp, hash, node)
          }

          if (fileSet && fp && !statted.includes(fp)) {
            promises.push(addFile(fp))
          }
        }
      }
    }
  })

  await Promise.all(promises)

  /**
   * @param {string} filePath
   * @param {string} hash
   */
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

  /**
   * @param {string} filePath
   * @param {string} hash
   */
  function addLandmark(filePath, hash) {
    /** @type {Record<string, boolean>} */
    const marks =
      filePath in landmarks
        ? landmarks[filePath]
        : (landmarks[filePath] = Object.create(null))

    marks[hash] = true
  }

  /**
   * @param {string} filePath
   * @param {string} hash
   * @param {Resource} node
   */
  function addReference(filePath, hash, node) {
    /** @type {Record<string, Resource[]>} */
    const refs =
      filePath in references
        ? references[filePath]
        : (references[filePath] = Object.create(null))
    const hashes = hash in refs ? refs[hash] : (refs[hash] = [])

    hashes.push(node)
  }

  /**
   * @param {string} filePath
   */
  async function addFile(filePath) {
    statted.push(filePath)

    try {
      const stats = await fs.stat(filePath)

      if (stats.isDirectory()) {
        /** @type {string[]} */
        let entries = []

        try {
          entries = await fs.readdir(filePath)
          // Seems to never happen after a stat.
          /* c8 ignore next */
        } catch {}

        const files = entries.sort()
        let index = -1
        /** @type {string|undefined} */
        let file

        while (++index < files.length) {
          const entry = entries[index]

          if (readme(entry)) {
            file = entry
            break
          }
        }

        // To do: test for no readme in directory.

        // Else, there’s no readme that we can parse, so add the directory.
        if (file) {
          filePath = path.join(filePath, file)
          statted.push(filePath)
        }
      }
    } catch {}

    if (fileSet && !added.includes(filePath)) {
      added.push(filePath)
      fileSet.add(
        toVFile({cwd: file.cwd, path: path.relative(file.cwd, filePath)})
      )
    }
  }
}

/**
 * @param {string} value
 * @param {{urlConfig: UrlConfig, path: string, base: string, root: string|undefined}} config
 * @param {string} type
 */
// eslint-disable-next-line complexity
function urlToPath(value, config, type) {
  // Absolute paths: `/wooorm/test/blob/main/directory/example.md`.
  if (value.charAt(0) === slash) {
    if (!config.urlConfig.hostname) {
      return
    }

    // Create a URL.
    value = https + slashes + config.urlConfig.hostname + value
  }

  /** @type {URL|undefined} */
  let url

  try {
    url = new URL(value)
  } catch {}

  // URLs: `https://github.com/wooorm/test/blob/main/directory/example.md`.
  if (url && config.root) {
    // Exit if we don’t have hosted Git info or this is not a URL to the repo.
    if (
      !config.urlConfig.prefix ||
      !config.urlConfig.hostname ||
      (url.protocol !== https && url.protocol !== http) ||
      url.hostname !== config.urlConfig.hostname ||
      url.pathname.slice(0, config.urlConfig.prefix.length) !==
        config.urlConfig.prefix
    ) {
      return
    }

    value = url.pathname.slice(config.urlConfig.prefix.length)

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

/**
 * @param {string} url
 * @param {{urlConfig: UrlConfig, path: string, base: string, root: string|undefined}} config
 */
function normalize(url, config) {
  const numberSignIndex = url.indexOf(numberSign)
  const lines = config.urlConfig.lines
  const prefix = config.urlConfig.headingPrefix
  const topAnchor = config.urlConfig.topAnchor
  /** @type {string} */
  let filePath
  /** @type {string|undefined} */
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
      prefix &&
      ((lines && lineExpression.test(hash)) ||
        hash.slice(0, prefix.length) !== prefix)
    ) {
      hash = undefined
    }
    // Use the hash if it starts with a heading prefix.
    else if (prefix) {
      hash = hash.slice(prefix.length)
    }
  }

  return {filePath: decodeURIComponent(filePath), hash}
}

/**
 * @param {string} filePath
 */
function readme(filePath) {
  const ext = path.extname(filePath)

  return (
    readmeExtensions.has(ext) &&
    readmeBasename.test(path.basename(filePath, ext))
  )
}
