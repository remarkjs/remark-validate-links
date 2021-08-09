import {check} from './check/index.js'
import {find} from './find/index.js'
import {constants} from './constants.js'

cliCompleter.pluginId = constants.sourceId

export default function remarkValidateLinks(options, fileSet) {
  const settings = options || {}

  // Attach a `completer`.
  if (fileSet) {
    fileSet.use(cliCompleter)
  }

  return transformer

  // Find references and landmarks.
  function transformer(tree, file, next) {
    find.run(Object.assign({}, settings, {tree, file, fileSet}), done)

    function done(error) {
      if (error) {
        next(error)
      } else if (fileSet) {
        next()
      } else {
        checkAll([file], next)
      }
    }
  }
}

// Completer for the CLI (multiple files, supports parsing more files).
function cliCompleter(set, next) {
  checkAll(set.valueOf(), next)
}

function checkAll(files, next) {
  // Check all references and landmarks.
  check.run({files}, (error) => {
    next(error)
  })
}
