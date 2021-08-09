import fs from 'fs'

export function checkFiles(ctx, next) {
  const landmarks = ctx.landmarks
  const references = ctx.references
  const filePaths = []
  let actual = 0
  let filePath

  for (filePath in references) {
    if (landmarks[filePath] === undefined) {
      filePaths.push(filePath)
    }
  }

  if (filePaths.length === 0) {
    next()
  } else {
    let index = -1

    while (++index < filePaths.length) {
      const filePath = filePaths[index]
      fs.access(filePath, fs.F_OK, (error) => {
        const noEntry =
          error && (error.code === 'ENOENT' || error.code === 'ENOTDIR')

        landmarks[filePath] = Object.create(null)
        landmarks[filePath][''] = !noEntry

        if (++actual === filePaths.length) {
          next()
        }
      })
    }
  }
}
