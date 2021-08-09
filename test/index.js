import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import {promisify} from 'node:util'
import childProcess from 'node:child_process'
import test from 'tape'
import {readSync} from 'to-vfile'
import {remark} from 'remark'
import strip from 'strip-ansi'
import rimraf from 'rimraf'
import links from '../index.js'
import sort from './sort.js'

const exec = promisify(childProcess.exec)

process.chdir(path.resolve(process.cwd(), 'test', 'fixtures'))

test.onFinish(() => {
  process.chdir(path.resolve(process.cwd(), '..', '..'))
})

const bin = path.join('..', '..', 'node_modules', '.bin', 'remark')

test('remark-validate-links', async (t) => {
  t.deepEqual(
    (
      await remark().use(links).use(sort).process(readSync('github.md'))
    ).messages.map((d) => String(d)),
    [
      'github.md:5:37-5:51: Link to unknown heading: `world`',
      'github.md:27:10-27:37: Link to unknown file: `examples/world.md`',
      'github.md:29:10-29:35: Link to unknown file: `examples/world.md`',
      'github.md:49:10-49:40: Link to unknown file: `examples/world.md`',
      'github.md:51:10-51:38: Link to unknown file: `examples/world.md`'
    ],
    'should work on the API'
  )

  const file = await remark()
    .use(links)
    .use(sort)
    .process(
      '# \\_\\_proto__\n# constructor\n# toString\n[](#__proto__), [](#constructor), [](#toString)'
    )

  t.deepEqual(
    [
      // @ts-expect-error: hush.
      Object.keys(file.data.remarkValidateLinksLandmarks['']),
      // @ts-expect-error: hush.
      Object.keys(file.data.remarkValidateLinksReferences['']),
      file.messages
    ],
    [
      ['', '__proto__', 'constructor', 'tostring'],
      ['', '__proto__', 'constructor', 'tostring'],
      []
    ],
    'should support landmarks and references to prototypal values'
  )

  let {stderr} = await exec(
    [
      bin,
      '--no-config',
      '--no-ignore',
      '--use',
      '"../../index.js=repository:\\"invalid:shortcode\\""',
      '--use',
      '../sort.js',
      'small.md'
    ].join(' ')
  )

  t.deepEqual(
    strip(stderr),
    [
      'small.md',
      '  5:13-5:27  warning  Link to unknown heading: `world`  missing-heading  remark-validate-links',
      '',
      '⚠ 1 warning',
      ''
    ].join('\n'),
    'should ignore invalid repositories'
  )

  try {
    await exec(
      [
        bin,
        '--no-config',
        '--no-ignore',
        '--use',
        '"../../index.js=repository:\\"gist:wooorm/8504606\\""',
        '--use',
        '../sort.js',
        'small.md'
      ].join(' ')
    )
  } catch (error) {
    t.deepEqual(
      strip(error.stderr),
      [
        'small.md',
        '  5:13-5:27  warning  Link to unknown heading: `world`  missing-heading  remark-validate-links',
        '',
        '⚠ 1 warning',
        ''
      ].join('\n'),
      'should throw on Gist repositories'
    )
  }

  try {
    await exec(
      [
        bin,
        '--no-config',
        '--no-ignore',
        '--use',
        '../../index.js',
        '--use',
        '../sort.js',
        'FOOOO'
      ].join(' ')
    )
  } catch (error) {
    t.deepEqual(
      [/command failed/i.test(error), strip(error.stderr)],
      [
        true,
        [
          'FOOOO',
          '  1:1  error  No such file or directory',
          '',
          '✖ 1 error',
          ''
        ].join('\n')
      ],
      'should ignore unfound files (#1)'
    )
  }

  try {
    await exec(
      [
        bin,
        '--no-config',
        '--no-ignore',
        '--use',
        '../../index.js',
        '--use',
        '../sort.js',
        'definitions.md',
        'FOOOO'
      ].join(' ')
    )
  } catch (error) {
    t.deepEqual(
      [/command failed/i.test(error), strip(error.stderr)],
      [
        true,
        [
          'FOOOO',
          '         1:1  error    No such file or directory',
          '',
          'definitions.md',
          '  10:1-10:18  warning  Link to unknown heading: `world`  missing-heading  remark-validate-links',
          '',
          '2 messages (✖ 1 error, ⚠ 1 warning)',
          ''
        ].join('\n')
      ],
      'should ignore unfound files (#2)'
    )
  }

  ;({stderr} = await exec(
    [
      bin,
      '--no-config',
      '--no-ignore',
      '--use',
      '../../index.js',
      '--use',
      '../sort.js',
      'empty.md'
    ].join(' ')
  ))

  t.deepEqual(
    strip(stderr),
    'empty.md: no issues found\n',
    'should work if there are no links'
  )

  const promise = exec(
    [
      bin,
      '--no-config',
      '--no-ignore',
      '--use',
      '../../index.js',
      '--use',
      '../sort.js'
    ].join(' ')
  )

  if (promise.child.stdin) {
    fs.createReadStream('github.md').pipe(promise.child.stdin)
  }

  ;({stderr} = await promise)

  t.deepEqual(
    strip(stderr),
    [
      '<stdin>',
      '  5:37-5:51  warning  Link to unknown heading: `world`  missing-heading  remark-validate-links',
      '',
      '⚠ 1 warning',
      ''
    ].join('\n'),
    'should work with stdin'
  )
  ;({stderr} = await exec(
    [
      bin,
      '--no-config',
      '--no-ignore',
      '--use',
      '../../index.js',
      '--use',
      '../sort.js',
      'github.md'
    ].join(' ')
  ))

  t.deepEqual(
    strip(stderr),
    [
      'github.md',
      '    5:37-5:51  warning  Link to unknown heading: `world`                          missing-heading          remark-validate-links',
      '  27:10-27:37  warning  Link to unknown file: `examples/world.md`                 missing-file             remark-validate-links',
      '  29:10-29:35  warning  Link to unknown file: `examples/world.md`                 missing-file             remark-validate-links',
      '  41:10-41:41  warning  Link to unknown heading in `examples/github.md`: `world`  missing-heading-in-file  remark-validate-links',
      '  43:10-43:39  warning  Link to unknown heading in `examples/github.md`: `world`  missing-heading-in-file  remark-validate-links',
      '  49:10-49:40  warning  Link to unknown file: `examples/world.md`                 missing-file             remark-validate-links',
      '  49:10-49:40  warning  Link to unknown heading in `examples/world.md`: `hello`   missing-heading-in-file  remark-validate-links',
      '  51:10-51:38  warning  Link to unknown file: `examples/world.md`                 missing-file             remark-validate-links',
      '  51:10-51:38  warning  Link to unknown heading in `examples/world.md`: `hello`   missing-heading-in-file  remark-validate-links',
      '',
      '⚠ 9 warnings',
      ''
    ].join('\n'),
    'should work when not all files are given'
  )
  ;({stderr} = await exec(
    [
      bin,
      '--no-config',
      '--no-ignore',
      '--use',
      '../../index.js',
      '--use',
      '../sort.js',
      'github.md',
      'examples/github.md'
    ].join(' ')
  ))

  t.deepEqual(
    strip(stderr),
    [
      'examples/github.md',
      '    5:37-5:51  warning  Link to unknown heading: `world`                          missing-heading          remark-validate-links',
      '  19:10-19:29  warning  Link to unknown file: `../world.md`                       missing-file             remark-validate-links',
      '  29:10-29:33  warning  Link to unknown heading in `../github.md`: `world`        missing-heading-in-file  remark-validate-links',
      '  35:10-35:32  warning  Link to unknown file: `../world.md`                       missing-file             remark-validate-links',
      '  35:10-35:32  warning  Link to unknown heading in `../world.md`: `hello`         missing-heading-in-file  remark-validate-links',
      '',
      'github.md',
      '    5:37-5:51  warning  Link to unknown heading: `world`                          missing-heading          remark-validate-links',
      '  27:10-27:37  warning  Link to unknown file: `examples/world.md`                 missing-file             remark-validate-links',
      '  29:10-29:35  warning  Link to unknown file: `examples/world.md`                 missing-file             remark-validate-links',
      '  41:10-41:41  warning  Link to unknown heading in `examples/github.md`: `world`  missing-heading-in-file  remark-validate-links',
      '  43:10-43:39  warning  Link to unknown heading in `examples/github.md`: `world`  missing-heading-in-file  remark-validate-links',
      '  49:10-49:40  warning  Link to unknown file: `examples/world.md`                 missing-file             remark-validate-links',
      '  49:10-49:40  warning  Link to unknown heading in `examples/world.md`: `hello`   missing-heading-in-file  remark-validate-links',
      '  51:10-51:38  warning  Link to unknown file: `examples/world.md`                 missing-file             remark-validate-links',
      '  51:10-51:38  warning  Link to unknown heading in `examples/world.md`: `hello`   missing-heading-in-file  remark-validate-links',
      '',
      '⚠ 14 warnings',
      ''
    ].join('\n'),
    'should work when all files are given'
  )
  ;({stderr} = await exec(
    [
      bin,
      '--no-config',
      '--no-ignore',
      '--use',
      '../../index.js',
      '--use',
      '../sort.js',
      'definitions.md'
    ].join(' ')
  ))

  t.deepEqual(
    strip(stderr),
    [
      'definitions.md',
      '  10:1-10:18  warning  Link to unknown heading: `world`  missing-heading  remark-validate-links',
      '',
      '⚠ 1 warning',
      ''
    ].join('\n'),
    'should work with definitions'
  )
  ;({stderr} = await exec(
    [
      bin,
      '--no-config',
      '--no-ignore',
      '--use',
      '"../../index.js=repository:\\"wooorm/test\\""',
      '--use',
      '../sort.js',
      'github.md',
      'examples/github.md'
    ].join(' ')
  ))

  t.deepEqual(
    strip(stderr),
    [
      'examples/github.md',
      '     5:37-5:51  warning  Link to unknown heading: `world`                          missing-heading          remark-validate-links',
      '   15:34-15:91  warning  Link to unknown file: `../world.md`                       missing-file             remark-validate-links',
      '   17:12-17:72  warning  Link to unknown file: `../world.md`                       missing-file             remark-validate-links',
      '   19:10-19:29  warning  Link to unknown file: `../world.md`                       missing-file             remark-validate-links',
      '   29:10-29:33  warning  Link to unknown heading in `../github.md`: `world`        missing-heading-in-file  remark-validate-links',
      '   31:10-31:71  warning  Link to unknown heading in `../github.md`: `world`        missing-heading-in-file  remark-validate-links',
      '   33:10-33:74  warning  Link to unknown heading in `../github.md`: `world`        missing-heading-in-file  remark-validate-links',
      '   35:10-35:32  warning  Link to unknown file: `../world.md`                       missing-file             remark-validate-links',
      '   35:10-35:32  warning  Link to unknown heading in `../world.md`: `hello`         missing-heading-in-file  remark-validate-links',
      '   37:10-37:70  warning  Link to unknown file: `../world.md`                       missing-file             remark-validate-links',
      '   37:10-37:70  warning  Link to unknown heading in `../world.md`: `hello`         missing-heading-in-file  remark-validate-links',
      '   39:10-39:73  warning  Link to unknown file: `../world.md`                       missing-file             remark-validate-links',
      '   39:10-39:73  warning  Link to unknown heading in `../world.md`: `hello`         missing-heading-in-file  remark-validate-links',
      '',
      'github.md',
      '     5:37-5:51  warning  Link to unknown heading: `world`                          missing-heading          remark-validate-links',
      '  21:34-21:100  warning  Link to unknown file: `examples/world.md`                 missing-file             remark-validate-links',
      '   23:34-23:82  warning  Link to unknown file: `examples/world.md`                 missing-file             remark-validate-links',
      '   25:12-25:81  warning  Link to unknown file: `examples/world.md`                 missing-file             remark-validate-links',
      '   27:10-27:37  warning  Link to unknown file: `examples/world.md`                 missing-file             remark-validate-links',
      '   29:10-29:35  warning  Link to unknown file: `examples/world.md`                 missing-file             remark-validate-links',
      '   41:10-41:41  warning  Link to unknown heading in `examples/github.md`: `world`  missing-heading-in-file  remark-validate-links',
      '   43:10-43:39  warning  Link to unknown heading in `examples/github.md`: `world`  missing-heading-in-file  remark-validate-links',
      '   45:10-45:80  warning  Link to unknown heading in `examples/github.md`: `world`  missing-heading-in-file  remark-validate-links',
      '   47:10-47:83  warning  Link to unknown heading in `examples/github.md`: `world`  missing-heading-in-file  remark-validate-links',
      '   49:10-49:40  warning  Link to unknown file: `examples/world.md`                 missing-file             remark-validate-links',
      '   49:10-49:40  warning  Link to unknown heading in `examples/world.md`: `hello`   missing-heading-in-file  remark-validate-links',
      '   51:10-51:38  warning  Link to unknown file: `examples/world.md`                 missing-file             remark-validate-links',
      '   51:10-51:38  warning  Link to unknown heading in `examples/world.md`: `hello`   missing-heading-in-file  remark-validate-links',
      '   53:10-53:79  warning  Link to unknown file: `examples/world.md`                 missing-file             remark-validate-links',
      '   53:10-53:79  warning  Link to unknown heading in `examples/world.md`: `hello`   missing-heading-in-file  remark-validate-links',
      '   55:10-55:82  warning  Link to unknown file: `examples/world.md`                 missing-file             remark-validate-links',
      '   55:10-55:82  warning  Link to unknown heading in `examples/world.md`: `hello`   missing-heading-in-file  remark-validate-links',
      '',
      '⚠ 31 warnings',
      ''
    ].join('\n'),
    'should work on GitHub URLs when given a repo'
  )

  await exec('git init')
  await exec('git remote add origin git@github.com:wooorm/test.git')
  ;({stderr} = await exec(
    [
      bin,
      '--no-config',
      '--no-ignore',
      '--use',
      '../../index.js',
      '--use',
      '../sort.js',
      'github.md',
      'examples/github.md'
    ].join(' ')
  ))

  t.deepEqual(
    strip(stderr),
    [
      'examples/github.md',
      '     5:37-5:51  warning  Link to unknown heading: `world`                          missing-heading          remark-validate-links',
      '   15:34-15:91  warning  Link to unknown file: `../world.md`                       missing-file             remark-validate-links',
      '   17:12-17:72  warning  Link to unknown file: `../world.md`                       missing-file             remark-validate-links',
      '   19:10-19:29  warning  Link to unknown file: `../world.md`                       missing-file             remark-validate-links',
      '   29:10-29:33  warning  Link to unknown heading in `../github.md`: `world`        missing-heading-in-file  remark-validate-links',
      '   31:10-31:71  warning  Link to unknown heading in `../github.md`: `world`        missing-heading-in-file  remark-validate-links',
      '   33:10-33:74  warning  Link to unknown heading in `../github.md`: `world`        missing-heading-in-file  remark-validate-links',
      '   35:10-35:32  warning  Link to unknown file: `../world.md`                       missing-file             remark-validate-links',
      '   35:10-35:32  warning  Link to unknown heading in `../world.md`: `hello`         missing-heading-in-file  remark-validate-links',
      '   37:10-37:70  warning  Link to unknown file: `../world.md`                       missing-file             remark-validate-links',
      '   37:10-37:70  warning  Link to unknown heading in `../world.md`: `hello`         missing-heading-in-file  remark-validate-links',
      '   39:10-39:73  warning  Link to unknown file: `../world.md`                       missing-file             remark-validate-links',
      '   39:10-39:73  warning  Link to unknown heading in `../world.md`: `hello`         missing-heading-in-file  remark-validate-links',
      '',
      'github.md',
      '     5:37-5:51  warning  Link to unknown heading: `world`                          missing-heading          remark-validate-links',
      '  21:34-21:100  warning  Link to unknown file: `examples/world.md`                 missing-file             remark-validate-links',
      '   23:34-23:82  warning  Link to unknown file: `examples/world.md`                 missing-file             remark-validate-links',
      '   25:12-25:81  warning  Link to unknown file: `examples/world.md`                 missing-file             remark-validate-links',
      '   27:10-27:37  warning  Link to unknown file: `examples/world.md`                 missing-file             remark-validate-links',
      '   29:10-29:35  warning  Link to unknown file: `examples/world.md`                 missing-file             remark-validate-links',
      '   41:10-41:41  warning  Link to unknown heading in `examples/github.md`: `world`  missing-heading-in-file  remark-validate-links',
      '   43:10-43:39  warning  Link to unknown heading in `examples/github.md`: `world`  missing-heading-in-file  remark-validate-links',
      '   45:10-45:80  warning  Link to unknown heading in `examples/github.md`: `world`  missing-heading-in-file  remark-validate-links',
      '   47:10-47:83  warning  Link to unknown heading in `examples/github.md`: `world`  missing-heading-in-file  remark-validate-links',
      '   49:10-49:40  warning  Link to unknown file: `examples/world.md`                 missing-file             remark-validate-links',
      '   49:10-49:40  warning  Link to unknown heading in `examples/world.md`: `hello`   missing-heading-in-file  remark-validate-links',
      '   51:10-51:38  warning  Link to unknown file: `examples/world.md`                 missing-file             remark-validate-links',
      '   51:10-51:38  warning  Link to unknown heading in `examples/world.md`: `hello`   missing-heading-in-file  remark-validate-links',
      '   53:10-53:79  warning  Link to unknown file: `examples/world.md`                 missing-file             remark-validate-links',
      '   53:10-53:79  warning  Link to unknown heading in `examples/world.md`: `hello`   missing-heading-in-file  remark-validate-links',
      '   55:10-55:82  warning  Link to unknown file: `examples/world.md`                 missing-file             remark-validate-links',
      '   55:10-55:82  warning  Link to unknown heading in `examples/world.md`: `hello`   missing-heading-in-file  remark-validate-links',
      '',
      '⚠ 31 warnings',
      ''
    ].join('\n'),
    'should work when with Git directory'
  )

  rimraf.sync('./.git')

  fs.renameSync('../../.git', '../../.git.bak')

  try {
    await exec(
      [
        bin,
        '--no-config',
        '--no-ignore',
        '--use',
        '../../index.js',
        '--use',
        '../sort.js',
        'github.md'
      ].join(' ')
    )
  } catch (error) {
    fs.renameSync('../../.git.bak', '../../.git')
    t.ok(/not a git repository/i.test(error), 'should fail w/o Git repository')
  }

  await exec('git init')

  try {
    await exec(
      [
        bin,
        '--no-config',
        '--no-ignore',
        '--use',
        '../../index.js',
        'github.md'
      ].join(' ')
    )
  } catch (error) {
    rimraf.sync('./.git')
    t.ok(
      /Could not find remote origin/.test(error),
      'should fail w/o Git repository w/o remote'
    )
  }

  fs.renameSync('../../.git', '../../.git.bak')
  ;({stderr} = await exec(
    [
      bin,
      '--no-config',
      '--no-ignore',
      '--use',
      '"../../index.js=repository:\\"wooorm/test\\""',
      '--use',
      '../sort.js',
      'small.md'
    ].join(' ')
  ))

  fs.renameSync('../../.git.bak', '../../.git')
  t.deepEqual(
    strip(stderr),
    [
      'small.md',
      '  5:13-5:27  warning  Link to unknown heading: `world`  missing-heading  remark-validate-links',
      '',
      '⚠ 1 warning',
      ''
    ].join('\n'),
    'should work w/o Git repository w/ repo'
  )

  fs.renameSync('../../.git', '../../.git.bak')
  ;({stderr} = await exec(
    [
      bin,
      '--no-config',
      '--no-ignore',
      '--use',
      '"../../index.js=repository:{remote:\\"wooorm/test\\"}"',
      'small.md'
    ].join(' ')
  ))

  fs.renameSync('../../.git.bak', '../../.git')
  t.deepEqual(
    strip(stderr),
    [
      'small.md',
      '  5:13-5:27  warning  Link to unknown heading: `world`  missing-heading  remark-validate-links',
      '',
      '⚠ 1 warning',
      ''
    ].join('\n'),
    'should work w/o Git repository w/ remote'
  )

  fs.renameSync('../../.git', '../../.git.bak')
  ;({stderr} = await exec(
    [
      bin,
      '--no-config',
      '--no-ignore',
      '--use',
      '"../../index.js=repository:\\"wooorm/test\\",root:\\"../\\""',
      'small.md'
    ].join(' ')
  ))

  fs.renameSync('../../.git.bak', '../../.git')
  t.deepEqual(
    strip(stderr),
    [
      'small.md',
      '  5:13-5:27  warning  Link to unknown heading: `world`  missing-heading  remark-validate-links',
      '',
      '⚠ 1 warning',
      ''
    ].join('\n'),
    'should work w/o Git repository w/ remote and root'
  )

  fs.renameSync('../../.git', '../../.git.bak')
  ;({stderr} = await exec(
    [
      bin,
      '--no-config',
      '--no-ignore',
      '--use',
      '"../../index.js=repository:false"',
      '--use',
      '../sort.js',
      'github.md',
      'examples/github.md'
    ].join(' ')
  ))

  fs.renameSync('../../.git.bak', '../../.git')
  t.deepEqual(
    strip(stderr),
    [
      'examples/github.md',
      '    5:37-5:51  warning  Link to unknown heading: `world`                          missing-heading          remark-validate-links',
      '  19:10-19:29  warning  Link to unknown file: `../world.md`                       missing-file             remark-validate-links',
      '  29:10-29:33  warning  Link to unknown heading in `../github.md`: `world`        missing-heading-in-file  remark-validate-links',
      '  35:10-35:32  warning  Link to unknown file: `../world.md`                       missing-file             remark-validate-links',
      '  35:10-35:32  warning  Link to unknown heading in `../world.md`: `hello`         missing-heading-in-file  remark-validate-links',
      '',
      'github.md',
      '    5:37-5:51  warning  Link to unknown heading: `world`                          missing-heading          remark-validate-links',
      '  27:10-27:37  warning  Link to unknown file: `examples/world.md`                 missing-file             remark-validate-links',
      '  29:10-29:35  warning  Link to unknown file: `examples/world.md`                 missing-file             remark-validate-links',
      '  41:10-41:41  warning  Link to unknown heading in `examples/github.md`: `world`  missing-heading-in-file  remark-validate-links',
      '  43:10-43:39  warning  Link to unknown heading in `examples/github.md`: `world`  missing-heading-in-file  remark-validate-links',
      '  49:10-49:40  warning  Link to unknown file: `examples/world.md`                 missing-file             remark-validate-links',
      '  49:10-49:40  warning  Link to unknown heading in `examples/world.md`: `hello`   missing-heading-in-file  remark-validate-links',
      '  51:10-51:38  warning  Link to unknown file: `examples/world.md`                 missing-file             remark-validate-links',
      '  51:10-51:38  warning  Link to unknown heading in `examples/world.md`: `hello`   missing-heading-in-file  remark-validate-links',
      '  71:41-71:56  warning  Link to unknown heading: `readme`                         missing-heading          remark-validate-links',
      '',
      '⚠ 15 warnings',
      ''
    ].join('\n'),
    'should work with `repository:false`'
  )
  ;({stderr} = await exec(
    [
      bin,
      '--no-config',
      '--no-ignore',
      '--use',
      '"../../index.js=repository:\\"ssh://git@domain.com/user/project.git\\""',
      '--use',
      '../sort.js',
      'small.md'
    ].join(' ')
  ))

  t.deepEqual(
    strip(stderr),
    [
      'small.md',
      '  5:13-5:27  warning  Link to unknown heading: `world`  missing-heading  remark-validate-links',
      '',
      '⚠ 1 warning',
      ''
    ].join('\n'),
    'should work when finding non-hosted Git remotes'
  )
  ;({stderr} = await exec(
    [
      bin,
      '--no-config',
      '--no-ignore',
      '--use',
      '"../../index.js=repository:\\"gitlab:wooorm/test\\""',
      '--use',
      '../sort.js',
      'gitlab.md'
    ].join(' ')
  ))

  t.deepEqual(
    strip(stderr),
    [
      'gitlab.md',
      '     5:37-5:51  warning  Link to unknown heading: `world`                                              missing-heading          remark-validate-links',
      '  19:34-19:100  warning  Link to unknown file: `examples/world.md`. Did you mean `examples/gitlab.md`  missing-file             remark-validate-links',
      '   21:12-21:81  warning  Link to unknown file: `examples/world.md`. Did you mean `examples/gitlab.md`  missing-file             remark-validate-links',
      '   23:10-23:37  warning  Link to unknown file: `examples/world.md`. Did you mean `examples/gitlab.md`  missing-file             remark-validate-links',
      '   25:10-25:35  warning  Link to unknown file: `examples/world.md`. Did you mean `examples/gitlab.md`  missing-file             remark-validate-links',
      '   37:10-37:41  warning  Link to unknown heading in `examples/gitlab.md`: `world`                      missing-heading-in-file  remark-validate-links',
      '   39:10-39:39  warning  Link to unknown heading in `examples/gitlab.md`: `world`                      missing-heading-in-file  remark-validate-links',
      '   41:10-41:80  warning  Link to unknown heading in `examples/gitlab.md`: `world`                      missing-heading-in-file  remark-validate-links',
      '   43:10-43:83  warning  Link to unknown heading in `examples/gitlab.md`: `world`                      missing-heading-in-file  remark-validate-links',
      '   45:10-45:40  warning  Link to unknown file: `examples/world.md`. Did you mean `examples/gitlab.md`  missing-file             remark-validate-links',
      '   45:10-45:40  warning  Link to unknown heading in `examples/world.md`: `hello`                       missing-heading-in-file  remark-validate-links',
      '   47:10-47:38  warning  Link to unknown file: `examples/world.md`. Did you mean `examples/gitlab.md`  missing-file             remark-validate-links',
      '   47:10-47:38  warning  Link to unknown heading in `examples/world.md`: `hello`                       missing-heading-in-file  remark-validate-links',
      '   49:10-49:79  warning  Link to unknown file: `examples/world.md`. Did you mean `examples/gitlab.md`  missing-file             remark-validate-links',
      '   49:10-49:79  warning  Link to unknown heading in `examples/world.md`: `hello`                       missing-heading-in-file  remark-validate-links',
      '   51:10-51:82  warning  Link to unknown file: `examples/world.md`. Did you mean `examples/gitlab.md`  missing-file             remark-validate-links',
      '   51:10-51:82  warning  Link to unknown heading in `examples/world.md`: `hello`                       missing-heading-in-file  remark-validate-links',
      '',
      '⚠ 17 warnings',
      ''
    ].join('\n'),
    'should support a GitLab shortcode'
  )
  ;({stderr} = await exec(
    [
      bin,
      '--no-config',
      '--no-ignore',
      '--use',
      '"../../index.js=repository:\\"bitbucket:wooorm/test\\""',
      '--use',
      '../sort.js',
      'bitbucket.md'
    ].join(' ')
  ))

  t.deepEqual(
    strip(stderr),
    [
      'bitbucket.md',
      '     5:37-5:67  warning  Link to unknown heading: `world`                             missing-heading          remark-validate-links',
      '  21:34-21:102  warning  Link to unknown file: `examples/world.md`                    missing-file             remark-validate-links',
      '   23:12-23:83  warning  Link to unknown file: `examples/world.md`                    missing-file             remark-validate-links',
      '   25:10-25:37  warning  Link to unknown file: `examples/world.md`                    missing-file             remark-validate-links',
      '   27:10-27:35  warning  Link to unknown file: `examples/world.md`                    missing-file             remark-validate-links',
      '   39:10-39:60  warning  Link to unknown heading in `examples/bitbucket.md`: `world`  missing-heading-in-file  remark-validate-links',
      '   41:10-41:58  warning  Link to unknown heading in `examples/bitbucket.md`: `world`  missing-heading-in-file  remark-validate-links',
      '  43:10-43:101  warning  Link to unknown heading in `examples/bitbucket.md`: `world`  missing-heading-in-file  remark-validate-links',
      '  45:10-45:104  warning  Link to unknown heading in `examples/bitbucket.md`: `world`  missing-heading-in-file  remark-validate-links',
      '   47:10-47:56  warning  Link to unknown file: `examples/world.md`                    missing-file             remark-validate-links',
      '   47:10-47:56  warning  Link to unknown heading in `examples/world.md`: `hello`      missing-heading-in-file  remark-validate-links',
      '   49:10-49:54  warning  Link to unknown file: `examples/world.md`                    missing-file             remark-validate-links',
      '   49:10-49:54  warning  Link to unknown heading in `examples/world.md`: `hello`      missing-heading-in-file  remark-validate-links',
      '   51:10-51:97  warning  Link to unknown file: `examples/world.md`                    missing-file             remark-validate-links',
      '   51:10-51:97  warning  Link to unknown heading in `examples/world.md`: `hello`      missing-heading-in-file  remark-validate-links',
      '  53:10-53:100  warning  Link to unknown file: `examples/world.md`                    missing-file             remark-validate-links',
      '  53:10-53:100  warning  Link to unknown heading in `examples/world.md`: `hello`      missing-heading-in-file  remark-validate-links',
      '',
      '⚠ 17 warnings',
      ''
    ].join('\n'),
    'should support a Bitbucket shortcode'
  )
  ;({stderr} = await exec(
    [
      bin,
      '--no-config',
      '--no-ignore',
      '--use',
      '../../index.js',
      '--use',
      '../sort.js',
      'suggestions.md'
    ].join(' ')
  ))

  t.deepEqual(
    strip(stderr),
    [
      'suggestions.md',
      '  3:22-3:37  warning  Link to unknown heading: `helloo`. Did you mean `hello`                  missing-heading          remark-validate-links',
      '  7:17-7:39  warning  Link to unknown heading in `github.md`: `fiiiles`. Did you mean `files`  missing-heading-in-file  remark-validate-links',
      '',
      '⚠ 2 warnings',
      ''
    ].join('\n'),
    'should suggest similar links'
  )
  ;({stderr} = await exec(
    [
      bin,
      '--no-config',
      '--no-ignore',
      '--use',
      '"../../index.js=repository:\\"wooorm/test\\""',
      '--use',
      '../sort.js',
      'line-links.md'
    ].join(' ')
  ))

  t.deepEqual(
    strip(stderr),
    [
      'line-links.md',
      '  5:9-5:61  warning  Link to unknown file: `examples/missing.js`  missing-file  remark-validate-links',
      '  9:1-9:69  warning  Link to unknown file: `examples/missing.js`  missing-file  remark-validate-links',
      '',
      '⚠ 2 warnings',
      ''
    ].join('\n'),
    'should recognise links to particular lines'
  )
  ;({stderr} = await exec(
    [
      bin,
      '--no-config',
      '--no-ignore',
      '--use',
      '"../../index.js=repository:\\"wooorm/test\\""',
      '--use',
      '../sort.js',
      'weird-characters.md'
    ].join(' ')
  ))

  t.deepEqual(
    strip(stderr),
    [
      'weird-characters.md',
      '   11:17-11:87  warning  Link to unknown file: `examples/missing#characters.md`. Did you mean `examples/weird#characters.md`              missing-file             remark-validate-links',
      '   13:17-13:93  warning  Link to unknown file: `examples/missing#character/readme.md`. Did you mean `examples/weird#character/readme.md`  missing-file             remark-validate-links',
      '  15:17-15:114  warning  Link to unknown heading in `examples/weird#characters.md`: `world`                                               missing-heading-in-file  remark-validate-links',
      '  17:17-17:120  warning  Link to unknown heading in `examples/weird#character/readme.md`: `world`                                         missing-heading-in-file  remark-validate-links',
      '',
      '⚠ 4 warnings',
      ''
    ].join('\n'),
    'should recognise links with encoded URLs'
  )
  ;({stderr} = await exec(
    [
      bin,
      '--no-config',
      '--no-ignore',
      '--use',
      '"../../index.js=repository:\\"wooorm/test\\""',
      '--use',
      '../sort.js',
      'folder.md'
    ].join(' ')
  ))

  t.deepEqual(
    strip(stderr),
    [
      'folder.md',
      '    9:1-9:40  warning  Link to unknown heading in `folder/readme.markdown`: `missing`  missing-heading-in-file  remark-validate-links',
      '  17:1-17:24  warning  Link to unknown heading in `folder`: `missing`                  missing-heading-in-file  remark-validate-links',
      '  21:1-21:25  warning  Link to unknown file: `missing`                                 missing-file             remark-validate-links',
      '  21:1-21:25  warning  Link to unknown heading in `missing`: `missing`                 missing-heading-in-file  remark-validate-links',
      '  23:1-23:39  warning  Link to unknown heading in `folder-without-readme`: `missing`   missing-heading-in-file  remark-validate-links',
      '',
      '⚠ 5 warnings',
      ''
    ].join('\n'),
    'should support folders'
  )
  ;({stderr} = await exec(
    [
      bin,
      '--no-config',
      '--no-ignore',
      '--use',
      '../../index.js',
      '--use',
      '../sort.js',
      'file-as-folder.md'
    ].join(' ')
  ))

  t.deepEqual(
    strip(stderr),
    [
      'file-as-folder.md',
      '  1:1-1:28  warning  Link to unknown file: `file-as-folder.md/other`. Did you mean `file-as-folder.md`  missing-file  remark-validate-links',
      '',
      '⚠ 1 warning',
      ''
    ].join('\n'),
    'should warn on files as folders'
  )
  ;({stderr} = await exec(
    [
      bin,
      '--no-config',
      '--no-ignore',
      '--use',
      '"../../index.js=repository:\\"wooorm/test\\""',
      '--use',
      '../sort.js',
      'images.md'
    ].join(' ')
  ))

  t.deepEqual(
    strip(stderr),
    [
      'images.md',
      '  21:10-21:50  warning  Link to unknown file: `examples/missing.jpg`. Did you mean `examples/image.jpg`  missing-file  remark-validate-links',
      '  23:12-23:42  warning  Link to unknown file: `examples/missing.jpg`. Did you mean `examples/image.jpg`  missing-file  remark-validate-links',
      '  25:10-25:89  warning  Link to unknown file: `examples/missing.jpg`. Did you mean `examples/image.jpg`  missing-file  remark-validate-links',
      '   37:1-37:38  warning  Link to unknown file: `examples/missing.jpg`. Did you mean `examples/image.jpg`  missing-file  remark-validate-links',
      '   39:1-39:77  warning  Link to unknown file: `examples/missing.jpg`. Did you mean `examples/image.jpg`  missing-file  remark-validate-links',
      '',
      '⚠ 5 warnings',
      ''
    ].join('\n'),
    'should check images'
  )
  ;({stderr} = await exec(
    [
      bin,
      '--no-config',
      '--no-ignore',
      '--use',
      '"../../index.js=repository:\\"wooorm/test\\""',
      '--use',
      '../sort.js',
      'query-params.md'
    ].join(' ')
  ))

  t.deepEqual(
    strip(stderr),
    [
      'query-params.md',
      '  11:33-11:55  warning  Link to unknown heading: `query-params?`. Did you mean `query-params`  missing-heading  remark-validate-links',
      '',
      '⚠ 1 warning',
      ''
    ].join('\n'),
    'should support query parameters'
  )
  ;({stderr} = await exec(
    [
      bin,
      '--no-config',
      '--no-ignore',
      '--use',
      '../../index.js',
      '--use',
      '../sort.js',
      'case-insensitive-headings.md'
    ].join(' ')
  ))

  t.deepEqual(
    strip(stderr),
    [
      'case-insensitive-headings.md',
      '  5:13-5:27  warning  Link to unknown heading: `world`                          missing-heading          remark-validate-links',
      '  9:16-9:48  warning  Link to unknown heading in `examples/github.md`: `world`  missing-heading-in-file  remark-validate-links',
      '',
      '⚠ 2 warnings',
      ''
    ].join('\n'),
    'should support case insensitive headings'
  )
  ;({stderr} = await exec(
    [
      bin,
      '--no-config',
      '--no-ignore',
      '--use',
      '"../../index.js=repository:\\"wooorm/test\\""',
      '--use',
      '../sort.js',
      'external.md'
    ].join(' ')
  ))

  t.deepEqual(
    strip(stderr),
    'external.md: no issues found\n',
    'should ignore external links'
  )
  ;({stderr} = await exec(
    [
      bin,
      '--no-config',
      '--no-ignore',
      '--use',
      '../../index.js=repository:false',
      '--use',
      '../sort.js',
      'external.md'
    ].join(' ')
  ))

  t.deepEqual(
    strip(stderr),
    'external.md: no issues found\n',
    'should ignore external links (without repo)'
  )

  await exec('git init')
  await exec('git remote add origin git@gitlab.acme.company:acme/project.git')
  ;({stderr} = await exec(
    [
      bin,
      '--no-config',
      '--no-ignore',
      '--use',
      '"../../index.js=urlConfig:{hostname:\\"gitlab.acme.com\\",prefix:\\"/acme/project/blob/\\",headingPrefix:\\"#\\",lines:true}"',
      'self-hosted.md'
    ].join(' ')
  ))

  t.deepEqual(
    strip(stderr),
    [
      'self-hosted.md',
      '  5:1-5:80  warning  Link to unknown heading: `world`  missing-heading  remark-validate-links',
      '',
      '⚠ 1 warning',
      ''
    ].join('\n'),
    'should support self-hosted Git solutions'
  )

  rimraf.sync('./.git')

  t.end()
})
