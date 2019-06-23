'use strict'

var path = require('path')
var exec = require('child_process').exec

module.exports = findRepo

function findRepo(ctx, next) {
  var repo = ctx.repository
  var file = ctx.file
  var base = file.cwd
  var actual = 0
  var expected = 0

  if (file.path) {
    base = path.dirname(path.resolve(base, file.path))
  }

  if (repo === null || repo === undefined) {
    expected++
    exec('git remote -v', {cwd: base}, onremote)
  }

  if (ctx.root === null || ctx.root === undefined) {
    if (repo === null || repo === undefined) {
      expected++
      exec('git rev-parse --show-cdup', {cwd: base}, oncdup)
    } else {
      ctx.root = ctx.file.cwd
    }
  } else {
    ctx.root = path.resolve(file.cwd, ctx.root)
  }

  if (actual === expected) {
    next()
  }

  function onremote(err, stdout) {
    var remote

    if (err) {
      expected = Infinity
      return next(err)
    }

    remote = stdout.match(/origin\t(.+?) \(fetch\)/)
    ctx.repository = remote ? remote[1] : null

    if (!ctx.repository) {
      expected = Infinity
      return next(new Error('Could not find remote origin'))
    }

    if (++actual === expected) {
      expected = Infinity
      next()
    }
  }

  function oncdup(err, stdout) {
    var out

    if (err) {
      expected = Infinity
      return next(err)
    }

    out = stdout.trim()
    ctx.root = out ? path.join(base, out) : base

    if (++actual === expected) {
      next()
    }
  }
}
