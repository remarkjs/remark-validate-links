import path from 'path'
import {exec} from 'child_process'

export function findRepo(ctx, next) {
  const repo = ctx.repository
  const file = ctx.file
  let base = file.cwd
  let actual = 0
  let expected = 0

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

  function onremote(error, stdout) {
    if (error) {
      expected = Number.POSITIVE_INFINITY
      return next(error)
    }

    const remote = stdout.match(/origin\t(.+?) \(fetch\)/)
    ctx.repository = remote ? remote[1] : null

    if (!ctx.repository) {
      expected = Number.POSITIVE_INFINITY
      return next(new Error('Could not find remote origin'))
    }

    if (++actual === expected) {
      expected = Number.POSITIVE_INFINITY
      next()
    }
  }

  function oncdup(error, stdout) {
    if (error) {
      expected = Number.POSITIVE_INFINITY
      return next(error)
    }

    const out = stdout.trim()
    ctx.root = out ? path.join(base, out) : base

    if (++actual === expected) {
      next()
    }
  }
}
