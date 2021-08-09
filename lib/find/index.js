import {trough} from 'trough'
import {findRepo} from './find-repo.js'
import {config} from './config.js'
import {findReferences} from './find-references.js'

export const find = trough().use(findRepo).use(config).use(findReferences)
