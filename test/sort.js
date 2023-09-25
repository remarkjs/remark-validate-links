/**
 * @typedef {import('mdast').Root} Root
 * @typedef {import('vfile').VFile} VFile
 */

import {compareMessage} from 'vfile-sort'

export default function unifiedSort() {
  /**
   * @param {Root} _
   * @param {VFile} file
   */
  return (_, file) => {
    file.messages.sort(compareMessage)
  }
}
