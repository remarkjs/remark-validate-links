/**
 * @typedef {import('node:child_process').ExecException} ExecException
 *   Exec error.
 */

/**
 * @typedef {ExecException & {stderr: string, stdout: string}} ExecError
 *   Exec error (with fields that exist).
 */

import assert from 'node:assert/strict'
import {exec as execCallback} from 'node:child_process'
import {createReadStream, promises as fs} from 'node:fs'
import process from 'node:process'
import {fileURLToPath} from 'node:url'
import test from 'node:test'
import {promisify} from 'node:util'
import {remark} from 'remark'
import strip from 'strip-ansi'
import {read} from 'to-vfile'
import remarkValidateLinks from '../index.js'
import sort from './sort.js'

const exec = promisify(execCallback)

const baseUrl = new URL('../', import.meta.url)
const fakeBaseUrl = new URL('fixtures/', import.meta.url)

const gitUrl = new URL('../.git', import.meta.url)
const gitBakUrl = new URL('../.git.bak', import.meta.url)
const bin = fileURLToPath(
  new URL('../node_modules/.bin/remark', import.meta.url)
)

test('remark-validate-links', async function (t) {
  process.chdir(fileURLToPath(fakeBaseUrl))

  await t.test('should expose the public api', async function () {
    assert.deepEqual(Object.keys(await import('../index.js')).sort(), [
      'default'
    ])
  })

  await t.test('should work on the API', async function () {
    const file = await remark()
      .use(remarkValidateLinks)
      .use(sort)
      .process(await read('github.md'))

    assert.deepEqual(file.messages.map(String), [
      'github.md:5:37-5:51: Link to unknown heading: `world`',
      'github.md:27:10-27:37: Link to unknown file: `examples/world.md`',
      'github.md:29:10-29:35: Link to unknown file: `examples/world.md`',
      'github.md:49:10-49:40: Link to unknown file: `examples/world.md`',
      'github.md:51:10-51:38: Link to unknown file: `examples/world.md`'
    ])

    assert.ok(
      file.messages.every(function (message) {
        return (
          message.url ===
          'https://github.com/remarkjs/remark-validate-links#readme'
        )
      })
    )
  })

  await t.test(
    'should support landmarks and references to prototypal values',
    async function () {
      const file = await remark()
        .use(remarkValidateLinks)
        .use(sort)
        .process(
          '# \\_\\_proto__\n# constructor\n# toString\n[](#__proto__), [](#constructor), [](#toString)'
        )

      assert.deepEqual(file.messages, [])
    }
  )

  await t.test('should slug headings with HTML correctly', async function () {
    const file = await remark()
      .use(remarkValidateLinks)
      .use(sort)
      .process(
        '# a <!-- b --> c\n# a <!-- b -->\n# a\n[](#a--c) [](#a-), [](#a)'
      )

    assert.deepEqual(file.messages.map(String), [])
  })

  await t.test('should ignore invalid repositories', async function () {
    const result = await exec(
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

    assert.equal(
      strip(result.stderr),
      [
        'small.md',
        '  5:13-5:27  warning  Link to unknown heading: `world`  missing-heading  remark-validate-links',
        '',
        '⚠ 1 warning',
        ''
      ].join('\n')
    )
  })

  await t.test('should not fail on Gist repositories', async function () {
    const result = await exec(
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

    assert.equal(
      strip(result.stderr),
      [
        'small.md',
        '  5:13-5:27  warning  Link to unknown heading: `world`  missing-heading  remark-validate-links',
        '',
        '⚠ 1 warning',
        ''
      ].join('\n')
    )
  })

  await t.test('should ignore unfound files (#1)', async function () {
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
      assert.fail()
    } catch (error) {
      const cause = /** @type {ExecError} */ (error)
      assert.match(String(cause), /command failed/i)
      assert.equal(
        strip(cause.stderr),
        [
          'FOOOO',
          '  1:1  error  No such file or directory',
          '',
          '✖ 1 error',
          ''
        ].join('\n')
      )
    }
  })

  await t.test('should ignore unfound files (#2)', async function () {
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
      assert.fail()
    } catch (error) {
      const cause = /** @type {ExecError} */ (error)
      assert.match(String(cause), /command failed/i)
      assert.equal(
        strip(cause.stderr),
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
      )
    }
  })

  await t.test('should work if there are no links', async function () {
    const result = await exec(
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
    )

    assert.equal(strip(result.stderr), 'empty.md: no issues found\n')
  })

  await t.test('should work with stdin', async function () {
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
      createReadStream('github.md').pipe(promise.child.stdin)
    }

    const result = await promise

    assert.equal(
      strip(result.stderr),
      [
        '<stdin>',
        '  5:37-5:51  warning  Link to unknown heading: `world`  missing-heading  remark-validate-links',
        '',
        '⚠ 1 warning',
        ''
      ].join('\n')
    )
  })

  await t.test('should work when not all files are given', async function () {
    const result = await exec(
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

    assert.equal(
      strip(result.stderr),
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
      ].join('\n')
    )
  })

  await t.test('should work when all files are given', async function () {
    const result = await exec(
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
    )

    assert.equal(
      strip(result.stderr),
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
      ].join('\n')
    )
  })

  await t.test('should work with definitions', async function () {
    const result = await exec(
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
    )

    assert.equal(
      strip(result.stderr),
      [
        'definitions.md',
        '  10:1-10:18  warning  Link to unknown heading: `world`  missing-heading  remark-validate-links',
        '',
        '⚠ 1 warning',
        ''
      ].join('\n')
    )
  })

  await t.test(
    'should work on GitHub URLs when given a repo',
    async function () {
      const result = await exec(
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
      )

      assert.equal(
        strip(result.stderr),
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
        ].join('\n')
      )
    }
  )

  await t.test('should work when with Git directory', async function () {
    await exec('git init')
    await exec('git remote add origin git@github.com:wooorm/test.git')
    const result = await exec(
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
    )

    assert.equal(
      strip(result.stderr),
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
      ].join('\n')
    )
  })

  await t.test('should fail w/o Git repository', async function () {
    await fs.rm('./.git', {recursive: true})
    await fs.rename(gitUrl, gitBakUrl)

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
      assert.fail()
    } catch (error) {
      const cause = /** @type {ExecError} */ (error)
      assert.ok(/not a git repository/i.test(String(cause)))
    } finally {
      await fs.rename(gitBakUrl, gitUrl)
    }
  })

  await t.test('should fail w/o Git repository w/o remote', async function () {
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
      assert.fail()
    } catch (error) {
      const cause = /** @type {ExecError} */ (error)
      await fs.rm('./.git', {recursive: true})
      assert.ok(/Could not find remote origin/.test(String(cause)))
    }
  })

  await t.test('should work w/o Git repository w/ repo', async function () {
    await fs.rename(gitUrl, gitBakUrl)

    const result = await exec(
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
    )

    await fs.rename(gitBakUrl, gitUrl)

    assert.equal(
      strip(result.stderr),
      [
        'small.md',
        '  5:13-5:27  warning  Link to unknown heading: `world`  missing-heading  remark-validate-links',
        '',
        '⚠ 1 warning',
        ''
      ].join('\n')
    )
  })

  await t.test('should work w/o Git repository w/ remote', async function () {
    await fs.rename(gitUrl, gitBakUrl)

    const result = await exec(
      [
        bin,
        '--no-config',
        '--no-ignore',
        '--use',
        '"../../index.js=repository:{remote:\\"wooorm/test\\"}"',
        'small.md'
      ].join(' ')
    )

    await fs.rename(gitBakUrl, gitUrl)

    assert.equal(
      strip(result.stderr),
      [
        'small.md',
        '  5:13-5:27  warning  Link to unknown heading: `world`  missing-heading  remark-validate-links',
        '',
        '⚠ 1 warning',
        ''
      ].join('\n')
    )
  })

  await t.test(
    'should work w/o Git repository w/ remote and root',
    async function () {
      await fs.rename(gitUrl, gitBakUrl)

      const result = await exec(
        [
          bin,
          '--no-config',
          '--no-ignore',
          '--use',
          '"../../index.js=repository:\\"wooorm/test\\",root:\\"../\\""',
          'small.md'
        ].join(' ')
      )

      await fs.rename(gitBakUrl, gitUrl)

      assert.equal(
        strip(result.stderr),
        [
          'small.md',
          '  5:13-5:27  warning  Link to unknown heading: `world`  missing-heading  remark-validate-links',
          '',
          '⚠ 1 warning',
          ''
        ].join('\n')
      )
    }
  )

  await t.test('should work with `repository:false`', async function () {
    await fs.rename(gitUrl, gitBakUrl)

    const result = await exec(
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
    )

    await fs.rename(gitBakUrl, gitUrl)

    assert.equal(
      strip(result.stderr),
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
      ].join('\n')
    )
  })

  await t.test(
    'should work when finding non-hosted Git remotes',
    async function () {
      const result = await exec(
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
      )

      assert.equal(
        strip(result.stderr),
        [
          'small.md',
          '  5:13-5:27  warning  Link to unknown heading: `world`  missing-heading  remark-validate-links',
          '',
          '⚠ 1 warning',
          ''
        ].join('\n')
      )
    }
  )

  await t.test('should support a GitLab shortcode', async function () {
    const result = await exec(
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
    )

    assert.equal(
      strip(result.stderr),
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
      ].join('\n')
    )
  })

  await t.test('should support a Bitbucket shortcode', async function () {
    const result = await exec(
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
    )

    assert.equal(
      strip(result.stderr),
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
      ].join('\n')
    )
  })

  await t.test('should suggest similar links', async function () {
    const result = await exec(
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
    )

    assert.equal(
      strip(result.stderr),
      [
        'suggestions.md',
        '  3:22-3:37  warning  Link to unknown heading: `helloo`. Did you mean `hello`                  missing-heading          remark-validate-links',
        '  7:17-7:39  warning  Link to unknown heading in `github.md`: `fiiiles`. Did you mean `files`  missing-heading-in-file  remark-validate-links',
        '',
        '⚠ 2 warnings',
        ''
      ].join('\n')
    )
  })

  await t.test('should recognise links to particular lines', async function () {
    const result = await exec(
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
    )

    assert.equal(
      strip(result.stderr),
      [
        'line-links.md',
        '  5:9-5:61  warning  Link to unknown file: `examples/missing.js`  missing-file  remark-validate-links',
        '  9:1-9:69  warning  Link to unknown file: `examples/missing.js`  missing-file  remark-validate-links',
        '',
        '⚠ 2 warnings',
        ''
      ].join('\n')
    )
  })

  await t.test('should recognise links with encoded URLs', async function () {
    const result = await exec(
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
    )

    assert.equal(
      strip(result.stderr),
      [
        'weird-characters.md',
        '   11:17-11:87  warning  Link to unknown file: `examples/missing#characters.md`. Did you mean `examples/weird#characters.md`              missing-file             remark-validate-links',
        '   13:17-13:93  warning  Link to unknown file: `examples/missing#character/readme.md`. Did you mean `examples/weird#character/readme.md`  missing-file             remark-validate-links',
        '  15:17-15:114  warning  Link to unknown heading in `examples/weird#characters.md`: `world`                                               missing-heading-in-file  remark-validate-links',
        '  17:17-17:120  warning  Link to unknown heading in `examples/weird#character/readme.md`: `world`                                         missing-heading-in-file  remark-validate-links',
        '',
        '⚠ 4 warnings',
        ''
      ].join('\n')
    )
  })

  await t.test('should support folders', async function () {
    const result = await exec(
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
    )

    assert.equal(
      strip(result.stderr),
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
      ].join('\n')
    )
  })

  await t.test('should warn on files as folders', async function () {
    const result = await exec(
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
    )

    assert.equal(
      strip(result.stderr),
      [
        'file-as-folder.md',
        '  1:1-1:28  warning  Link to unknown file: `file-as-folder.md/other`. Did you mean `file-as-folder.md`  missing-file  remark-validate-links',
        '',
        '⚠ 1 warning',
        ''
      ].join('\n')
    )
  })

  await t.test('should check images', async function () {
    const result = await exec(
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
    )

    assert.equal(
      strip(result.stderr),
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
      ].join('\n')
    )
  })

  await t.test('should slug image alts correctly', async function () {
    const result = await exec(
      [
        bin,
        '--no-config',
        '--no-ignore',
        '--use',
        '"../../index.js=repository:\\"wooorm/test\\""',
        '--use',
        '../sort.js',
        'image-alts.md'
      ].join(' ')
    )

    assert.equal(strip(result.stderr), 'image-alts.md: no issues found\n')
  })

  await t.test('should support query parameters', async function () {
    const result = await exec(
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
    )

    assert.equal(
      strip(result.stderr),
      [
        'query-params.md',
        '  11:33-11:55  warning  Link to unknown heading: `query-params?`. Did you mean `query-params`  missing-heading  remark-validate-links',
        '',
        '⚠ 1 warning',
        ''
      ].join('\n')
    )
  })

  await t.test('should support case insensitive headings', async function () {
    const result = await exec(
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
    )

    assert.equal(
      strip(result.stderr),
      [
        'case-insensitive-headings.md',
        '  5:13-5:27  warning  Link to unknown heading: `world`                          missing-heading          remark-validate-links',
        '  9:16-9:48  warning  Link to unknown heading in `examples/github.md`: `world`  missing-heading-in-file  remark-validate-links',
        '',
        '⚠ 2 warnings',
        ''
      ].join('\n')
    )
  })

  await t.test('should ignore external links', async function () {
    const result = await exec(
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
    )

    assert.equal(strip(result.stderr), 'external.md: no issues found\n')
  })

  await t.test(
    'should ignore external links (without repo)',
    async function () {
      const result = await exec(
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
      )

      assert.equal(strip(result.stderr), 'external.md: no issues found\n')
    }
  )

  await t.test('should support self-hosted Git solutions', async function () {
    await exec('git init')
    await exec('git remote add origin git@gitlab.acme.company:acme/project.git')
    const result = await exec(
      [
        bin,
        '--no-config',
        '--no-ignore',
        '--use',
        '"../../index.js=urlConfig:{hostname:\\"gitlab.acme.com\\",prefix:\\"/acme/project/blob/\\",headingPrefix:\\"#\\",lines:true}"',
        'self-hosted.md'
      ].join(' ')
    )

    assert.equal(
      strip(result.stderr),
      [
        'self-hosted.md',
        '  5:1-5:80  warning  Link to unknown heading: `world`  missing-heading  remark-validate-links',
        '',
        '⚠ 1 warning',
        ''
      ].join('\n')
    )
  })

  await fs.rm('./.git', {recursive: true, force: true})

  process.chdir(fileURLToPath(baseUrl))
})
