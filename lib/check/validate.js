/**
 * @typedef {import('../types.js').VFile} VFile
 * @typedef {import('../types.js').Landmarks} Landmarks
 * @typedef {import('../types.js').References} References
 * @typedef {import('../types.js').ReferenceMap} ReferenceMap
 */

import path from 'node:path'
// @ts-expect-error: untyped.
import propose from 'propose'
import {constants} from '../constants.js'

const own = {}.hasOwnProperty

/**
 * @param {{files: VFile[], landmarks: Landmarks, references: References}} ctx
 */
export function validate(ctx) {
  const landmarks = ctx.landmarks
  const references = ctx.references
  /** @type {ReferenceMap[]} */
  const missing = []
  /** @type {string} */
  let key

  for (key in references) {
    if (own.call(references, key)) {
      const refs = references[key]
      /** @type {Landmarks} */
      const lands =
        // `else` could happen in browser.
        /* c8 ignore next */
        key in landmarks ? landmarks[key] : Object.create(null)
      /** @type {string} */
      let hash

      for (hash in refs) {
        if (!lands[hash]) {
          missing.push(...refs[hash])
        }
      }
    }
  }

  let index = -1

  while (++index < missing.length) {
    warn(ctx, missing[index])
  }
}

/**
 * @param {{files: VFile[], landmarks: Landmarks, references: References}} ctx
 * @param {ReferenceMap} reference
 */
function warn(ctx, reference) {
  const landmarks = ctx.landmarks
  const absolute = reference.file.path
    ? path.resolve(reference.file.cwd, reference.file.path)
    : ''
  const base = absolute ? path.dirname(absolute) : null
  const filePath = base
    ? path.relative(base, reference.reference.filePath)
    : reference.reference.filePath
  const hash = reference.reference.hash
  /** @type {string[]} */
  const dictionary = []
  /** @type {string} */
  let reason
  /** @type {string} */
  let ruleId

  if (hash) {
    reason = 'Link to unknown heading'
    ruleId = constants.headingRuleId

    if (base && path.join(base, filePath) !== absolute) {
      reason += ' in `' + filePath + '`'
      ruleId = constants.headingInFileRuleId
    }

    reason += ': `' + hash + '`'
  } else {
    reason = 'Link to unknown file: `' + filePath + '`'
    ruleId = constants.fileRuleId
  }

  const origin = [constants.sourceId, ruleId].join(':')
  /** @type {string} */
  let landmark

  for (landmark in landmarks) {
    // Only suggest if file exists.
    if (!(landmark in landmarks) || !landmarks[landmark]['']) {
      continue
    }

    const relativeLandmark = base ? path.relative(base, landmark) : landmark

    if (!hash) {
      dictionary.push(relativeLandmark)
      continue
    }

    if (relativeLandmark !== filePath) {
      continue
    }

    /** @type {string} */
    let subhash

    for (subhash in landmarks[landmark]) {
      if (subhash !== '') {
        dictionary.push(subhash)
      }
    }
  }

  const suggestion = propose(hash ? hash : filePath, dictionary, {
    threshold: 0.7
  })

  if (suggestion) {
    reason += '. Did you mean `' + suggestion + '`'
  }

  let index = -1

  while (++index < reference.nodes.length) {
    reference.file.message(reason, reference.nodes[index], origin)
  }
}
