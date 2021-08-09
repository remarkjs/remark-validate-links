import {promises as fs} from 'fs'

export async function checkFiles(ctx) {
  const landmarks = ctx.landmarks
  const references = ctx.references
  const promises = []
  let filePath

  for (filePath in references) {
    if (landmarks[filePath] === undefined) {
      const map = Object.create(null)

      landmarks[filePath] = map

      promises.push(
        fs.access(filePath, fs.F_OK).then(
          () => {
            map[''] = true
          },
          (error) => {
            map[''] = error.code !== 'ENOENT' && error.code !== 'ENOTDIR'
          }
        )
      )
    }
  }

  await Promise.all(promises)
}
