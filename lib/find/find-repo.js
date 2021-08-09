import path from 'path'
import {promisify} from 'util'
import {exec as execCb} from 'child_process'

const exec = promisify(execCb)

export async function findRepo(ctx) {
  const repo = ctx.repository
  const file = ctx.file
  let base = file.cwd

  if (file.path) {
    base = path.dirname(path.resolve(base, file.path))
  }

  if (repo === null || repo === undefined) {
    const {stdout} = await exec('git remote -v', {cwd: base})
    const remote = stdout.match(/origin\t(.+?) \(fetch\)/)

    ctx.repository = remote ? remote[1] : null

    if (!ctx.repository) {
      throw new Error('Could not find remote origin')
    }
  }

  if (ctx.root === null || ctx.root === undefined) {
    if (repo === null || repo === undefined) {
      const {stdout} = await exec('git rev-parse --show-cdup', {cwd: base})
      const out = stdout.trim()
      ctx.root = out ? path.join(base, out) : base
    } else {
      ctx.root = ctx.file.cwd
    }
  } else {
    ctx.root = path.resolve(file.cwd, ctx.root)
  }
}
