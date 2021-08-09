/**
 * @typedef {import('vfile').VFile} VFile
 * @typedef {import('../index.js').Options} Options
 */

import path from 'node:path'
import {promisify} from 'node:util'
import {exec as execCb} from 'node:child_process'

const exec = promisify(execCb)

/**
 * @param {{file: VFile, options: Options}} ctx
 */
export async function findRepo(ctx) {
  const repo = ctx.options.repository
  const file = ctx.file
  let base = file.cwd

  if (file.path) {
    base = path.dirname(path.resolve(base, file.path))
  }

  if (repo === null || repo === undefined) {
    const {stdout} = await exec('git remote -v', {cwd: base})
    const remote = stdout.match(/origin\t(.+?) \(fetch\)/)

    ctx.options.repository = remote ? remote[1] : undefined

    if (!ctx.options.repository) {
      throw new Error('Could not find remote origin')
    }
  }

  if (ctx.options.root === null || ctx.options.root === undefined) {
    if (repo === null || repo === undefined) {
      const {stdout} = await exec('git rev-parse --show-cdup', {cwd: base})
      const out = stdout.trim()
      ctx.options.root = out ? path.join(base, out) : base
    } else {
      ctx.options.root = ctx.file.cwd
    }
  } else {
    ctx.options.root = path.resolve(file.cwd, ctx.options.root)
  }
}
