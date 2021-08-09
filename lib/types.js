/**
 * @typedef {import('vfile').VFile} VFile
 * @typedef {import('mdast').Root} Root
 * @typedef {import('mdast').Content} Content
 * @typedef {Extract<Root|Content, import('mdast').Resource>} Resource
 *
 * @typedef Reference
 * @property {string} filePath
 * @property {string} hash
 *
 * @typedef ReferenceMap
 * @property {VFile} file
 * @property {Reference} reference
 * @property {Resource[]} nodes
 *
 * @typedef {Record<string, Record<string, boolean>>} Landmarks
 * @typedef {Record<string, Record<string, ReferenceMap[]>>} References
 */

export {}
