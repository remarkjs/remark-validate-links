/**
 * @typedef {import('mdast').Root} Root
 * @typedef {import('vfile').VFile} VFile
 */

import {compareMessage} from 'vfile-sort'

/**
 * Sort messages.
 *
 * @returns
 *   Transform.
 */
export default function unifiedSort() {
  /**
   * Transform.
   *
   * @param {Root} _
   *   Tree.
   * @param {VFile} file
   *   File.
   * @returns {undefined}
   *   Nothing.
   */
  return function (_, file) {
    file.messages.sort(compareMessage)
  }
}
