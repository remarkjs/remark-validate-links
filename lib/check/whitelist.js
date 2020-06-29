
'use strict'


var fs = require('fs')
var data = fs.readFileSync('.checklinks-whitelist')
console.error(JSON.parse(data))
var jsonData = JSON.parse(data)

module.exports = whitelist

// whitelist(ctx) removes the link to a given file from the link-tree, if it has
// a substring match with a whitelisted variable in '.checklinks-whitelist'.
function whitelist(ctx) {
  var references = ctx.references
  var reference
  for (reference in references) {
    for (var whitelistedPath of jsonData.paths) {
      // Match on a substring of the reference with the whitelisted path
      if (reference.includes(whitelistedPath)) {
        console.error("Ignoring whitelisted link to: '%s'", whitelistedPath)
        if (!delete references[reference]) {
          console.error("Failed to delete the reference '%s'", reference)
        }
      }
    }
  }
}
