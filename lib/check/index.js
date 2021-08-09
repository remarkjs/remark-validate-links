import {trough} from 'trough'
import {mergeLandmarks} from './merge-landmarks.js'
import {mergeReferences} from './merge-references.js'
import {checkFiles} from './check-files.js'
import {validate} from './validate.js'

export const check = trough()
  .use(mergeLandmarks)
  .use(mergeReferences)
  .use(checkFiles)
  .use(validate)
