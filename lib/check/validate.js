import path from 'path'
import propose from 'propose'
import {constants} from '../constants.js'

const own = {}.hasOwnProperty

export function validate(ctx) {
  const landmarks = ctx.landmarks
  const references = ctx.references
  let missing = []
  let reference

  for (reference in references) {
    if (own.call(references, reference)) {
      const refs = references[reference]
      const lands =
        // `else` could happen in browser.
        /* c8 ignore next */
        reference in landmarks ? landmarks[reference] : Object.create(null)
      let hash

      for (hash in refs) {
        if (!lands[hash]) {
          missing = missing.concat(refs[hash])
        }
      }
    }
  }

  let index = -1

  while (++index < missing.length) {
    reference = missing[index]
    warn(ctx, reference.reference, reference.file, reference.nodes)
  }
}

function warn(ctx, info, file, nodes) {
  const landmarks = ctx.landmarks
  const absolute = file.path ? path.resolve(file.cwd, file.path) : ''
  const base = absolute ? path.dirname(absolute) : null
  const filePath = base ? path.relative(base, info.filePath) : info.filePath
  const hash = info.hash
  const dictionary = []
  let reason
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

  while (++index < nodes.length) {
    file.message(reason, nodes[index], origin)
  }
}
