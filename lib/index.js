/**
 * @typedef {import('mdast').Root} Root
 * @typedef {import('vfile').VFile} VFile
 * @typedef {import('unified-engine').FileSet} FileSet
 * @typedef {import('trough').Callback} Callback
 *
 * @typedef UrlConfig
 *   Hosted Git info
 * @property {string|undefined} [hostname]
 *   Domain of URLs (example: `'github.com'`, `'bitbucket.org'`).
 * @property {string|undefined} [prefix]
 *   Path prefix before files (example:
 *   `'/remarkjs/remark-validate-links/blob/'`,
 *   `'/remarkjs/remark-validate-links/src/'`).
 * @property {string|undefined} [headingPrefix]
 *   Prefix of headings (example: `'#'`, `'#markdown-header-'`).
 * @property {string|undefined} [topAnchor]
 *   Hash to top of readme (example: `#readme`).
 * @property {boolean|undefined} [lines]
 *   Whether lines in files can be linked.
 *
 * @typedef Options
 *   Configuration.
 * @property {string|false} [repository]
 *   If `repository` is nullish, the Git origin remote is detected.
 *   If the repository resolves to something npm understands as a Git host such
 *   as GitHub, GitLab, or Bitbucket, full URLs to that host (say,
 *   `https://github.com/remarkjs/remark-validate-links/readme.md#install`) can
 *   also be checked.
 *   If you’re not in a Git repository, you must pass `repository: false`
 *   explicitly.
 * @property {string} [root]
 *   A `root` (`string?`) can also be passed, referencing the local Git root
 *   directory (the place where `.git` is).
 *   If both `root` and `repository` are nullish, the Git root is detected.
 *   If `root` is not given but `repository` is, [`file.cwd`][cwd] is used.
 * @property {UrlConfig} [urlConfig]
 *   If you’re self-hosting a Git server, you can provide URL information
 *   directly, as `urlConfig` (`Object`).


 */

import {check} from './check/index.js'
import {find} from './find/index.js'
import {constants} from './constants.js'

cliCompleter.pluginId = constants.sourceId

/**
 * Plugin to validate that Markdown links and images reference existing local
 * files and headings.
 *
 * @type {import('unified').Plugin<[Options?, FileSet?]|[Options?]|void[], Root>}
 */
export default function remarkValidateLinks(options, fileSet) {
  // Attach a `completer`.
  if (fileSet) {
    fileSet.use(cliCompleter)
  }

  // Find references and landmarks.
  return (tree, file, next) => {
    find.run(
      {tree, file, fileSet, options: {...options}},
      /** @type {Callback} */
      (error) => {
        if (error) {
          next(error)
        } else if (fileSet) {
          next()
        } else {
          checkAll([file], next)
        }
      }
    )
  }
}

/**
 * Completer for the CLI (multiple files, supports parsing more files).
 *
 * @param {FileSet} set
 * @param {Callback} next
 * @returns {void}
 */
function cliCompleter(set, next) {
  checkAll(set.valueOf(), next)
}

/**
 * Completer for the CLI (multiple files, supports parsing more files).
 *
 * @param {VFile[]} files
 * @param {Callback} next
 * @returns {void}
 */
function checkAll(files, next) {
  // Check all references and landmarks.
  check.run(
    {files},
    /** @type {Callback} */
    (error) => {
      next(error)
    }
  )
}
