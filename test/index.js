/**
 * @import {ExecException} from 'node:child_process'
 */

/**
 * @typedef {ExecException & {stderr: string, stdout: string}} ExecError
 *   Exec error (with fields that exist).
 */

import assert from 'node:assert/strict'
import {exec as execCallback} from 'node:child_process'
import fs from 'node:fs/promises'
import process from 'node:process'
import {PassThrough} from 'node:stream'
import test from 'node:test'
import {fileURLToPath} from 'node:url'
import {promisify} from 'node:util'
import remarkValidateLinks from 'remark-validate-links'
import {remark} from 'remark'
import stripAnsi from 'strip-ansi'
import {read} from 'to-vfile'
import {VFile} from 'vfile'
import sort from './sort.js'

const exec = promisify(execCallback)

const baseUrl = new URL('../', import.meta.url)
const fakeBaseUrl = new URL('fixtures/', import.meta.url)

const gitUrl = new URL('../.git', import.meta.url)
const gitBakUrl = new URL('../.git.bak', import.meta.url)
const binary = fileURLToPath(
  new URL('../node_modules/.bin/remark', import.meta.url)
)

test('remark-validate-links', async function (t) {
  process.chdir(fileURLToPath(fakeBaseUrl))

  await t.test('should expose the public api', async function () {
    assert.deepEqual(
      Object.keys(await import('remark-validate-links')).sort(),
      ['default']
    )
  })

  await t.test('should work on the API', async function () {
    const file = await remark()
      .use(remarkValidateLinks)
      .use(sort)
      .process(await read('github.md'))

    assert.deepEqual(file.messages.map(String), [
      'github.md:5:37-5:51: Cannot find heading for `#world`',
      'github.md:11:31-11:58: Cannot find file `../../examples/github.md`; did you mean `examples/github.md`',
      'github.md:23:34-23:60: Cannot find file `../../examples/world.md`',
      'github.md:27:10-27:37: Cannot find file `examples/world.md`',
      'github.md:29:10-29:35: Cannot find file `examples/world.md`',
      'github.md:49:10-49:40: Cannot find file `examples/world.md`',
      'github.md:51:10-51:38: Cannot find file `examples/world.md`'
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

  await t.test('should support `skipUrlPatterns` (1)', async function () {
    const file = await remark()
      .use(remarkValidateLinks, {skipPathPatterns: ['#e']})
      .use(sort)
      .process('a [b](#c) [d](#e) f')

    assert.deepEqual(file.messages.map(String), [
      '1:3-1:10: Cannot find heading for `#c`'
    ])
  })

  await t.test('should support `skipUrlPatterns` (2)', async function () {
    const file = new VFile({
      cwd: fileURLToPath(fakeBaseUrl),
      path: 'example.md',
      value: 'a [b](../../new/main/?filename=skeets/<your-path>.tweet) c'
    })

    await remark()
      .use(remarkValidateLinks, {
        skipPathPatterns: [/remark-validate-links[/\\]new[/\\]/]
      })
      .use(sort)
      .process(file)

    assert.deepEqual(file.messages.map(String), [])
  })

  await t.test('should ignore invalid repositories', async function () {
    const result = await exec(
      [
        binary,
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
      stripAnsi(result.stderr),
      [
        'small.md',
        '5:13-5:27 warning Cannot find heading for `#world` missing-heading remark-validate-links:missing-heading',
        '',
        '⚠ 1 warning',
        ''
      ].join('\n')
    )
  })

  await t.test('should not fail on Gist repositories', async function () {
    const result = await exec(
      [
        binary,
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
      stripAnsi(result.stderr),
      [
        'small.md',
        '5:13-5:27 warning Cannot find heading for `#world` missing-heading remark-validate-links:missing-heading',
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
          binary,
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
        cleanError(stripAnsi(cause.stderr)),
        [
          'FOOOO',
          ' error No such file or folder',
          '  [cause]:',
          '    Error: ENOENT:…',
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
          binary,
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
        cleanError(stripAnsi(cause.stderr)),
        [
          'definitions.md',
          '1:1-1:1 warning Cannot find heading for `#world` missing-heading remark-validate-links:missing-heading',
          '',
          'FOOOO',
          '           error   No such file or folder',
          '  [cause]:',
          '    Error: ENOENT:…',
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
        binary,
        '--no-config',
        '--no-ignore',
        '--use',
        '../../index.js',
        '--use',
        '../sort.js',
        'empty.md'
      ].join(' ')
    )

    assert.equal(stripAnsi(result.stderr), 'empty.md: no issues found\n')
  })

  await t.test('should work with stdin', async function () {
    const promise = exec(
      [
        binary,
        '--no-config',
        '--no-ignore',
        '--use',
        '../../index.js',
        '--use',
        '../sort.js'
      ].join(' ')
    )

    const stream = new PassThrough()

    if (promise.child.stdin) {
      stream.pipe(promise.child.stdin)
    }

    setTimeout(function () {
      stream.write('# exists\n')
      setTimeout(function () {
        stream.write('[ok](#exists) and [also ok](./examples/github.md).\n')

        // eslint-disable-next-line max-nested-callbacks
        setTimeout(function () {
          stream.end('[nok](#not-exist) and [not ok](./examples/missing.md)\n')
        }, 4)
      }, 4)
    }, 4)

    const result = await promise

    assert.equal(
      stripAnsi(result.stderr),
      [
        '<stdin>',
        '3:1-3:18 warning Cannot find heading for `#not-exist` missing-heading remark-validate-links:missing-heading',
        '',
        '⚠ 1 warning',
        ''
      ].join('\n')
    )
  })

  await t.test('should work when not all files are given', async function () {
    const result = await exec(
      [
        binary,
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
      stripAnsi(result.stderr),
      [
        'github.md',
        '5:37-5:51   warning Cannot find heading for `#world`                                               missing-heading         remark-validate-links:missing-heading',
        '11:31-11:58 warning Cannot find file `../../examples/github.md`; did you mean `examples/github.md` missing-file            remark-validate-links:missing-file',
        '23:34-23:60 warning Cannot find file `../../examples/world.md`                                     missing-file            remark-validate-links:missing-file',
        '27:10-27:37 warning Cannot find file `examples/world.md`                                           missing-file            remark-validate-links:missing-file',
        '29:10-29:35 warning Cannot find file `examples/world.md`                                           missing-file            remark-validate-links:missing-file',
        '41:10-41:41 warning Cannot find heading for `#world` in `examples/github.md`                       missing-heading-in-file remark-validate-links:missing-heading-in-file',
        '43:10-43:39 warning Cannot find heading for `#world` in `examples/github.md`                       missing-heading-in-file remark-validate-links:missing-heading-in-file',
        '49:10-49:40 warning Cannot find file `examples/world.md`                                           missing-file            remark-validate-links:missing-file',
        '49:10-49:40 warning Cannot find heading for `#hello` in `examples/world.md`                        missing-heading-in-file remark-validate-links:missing-heading-in-file',
        '51:10-51:38 warning Cannot find file `examples/world.md`                                           missing-file            remark-validate-links:missing-file',
        '51:10-51:38 warning Cannot find heading for `#hello` in `examples/world.md`                        missing-heading-in-file remark-validate-links:missing-heading-in-file',
        '',
        '⚠ 11 warnings',
        ''
      ].join('\n')
    )
  })

  await t.test('should work when all files are given', async function () {
    const result = await exec(
      [
        binary,
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
      stripAnsi(result.stderr),
      [
        'examples/github.md',
        '5:37-5:51   warning Cannot find heading for `#world`                                               missing-heading         remark-validate-links:missing-heading',
        '19:10-19:29 warning Cannot find file `../world.md`                                                 missing-file            remark-validate-links:missing-file',
        '29:10-29:33 warning Cannot find heading for `#world` in `../github.md`                             missing-heading-in-file remark-validate-links:missing-heading-in-file',
        '35:10-35:32 warning Cannot find file `../world.md`                                                 missing-file            remark-validate-links:missing-file',
        '35:10-35:32 warning Cannot find heading for `#hello` in `../world.md`                              missing-heading-in-file remark-validate-links:missing-heading-in-file',
        '',
        'github.md',
        '5:37-5:51   warning Cannot find heading for `#world`                                               missing-heading         remark-validate-links:missing-heading',
        '11:31-11:58 warning Cannot find file `../../examples/github.md`; did you mean `examples/github.md` missing-file            remark-validate-links:missing-file',
        '23:34-23:60 warning Cannot find file `../../examples/world.md`                                     missing-file            remark-validate-links:missing-file',
        '27:10-27:37 warning Cannot find file `examples/world.md`                                           missing-file            remark-validate-links:missing-file',
        '29:10-29:35 warning Cannot find file `examples/world.md`                                           missing-file            remark-validate-links:missing-file',
        '41:10-41:41 warning Cannot find heading for `#world` in `examples/github.md`                       missing-heading-in-file remark-validate-links:missing-heading-in-file',
        '43:10-43:39 warning Cannot find heading for `#world` in `examples/github.md`                       missing-heading-in-file remark-validate-links:missing-heading-in-file',
        '49:10-49:40 warning Cannot find file `examples/world.md`                                           missing-file            remark-validate-links:missing-file',
        '49:10-49:40 warning Cannot find heading for `#hello` in `examples/world.md`                        missing-heading-in-file remark-validate-links:missing-heading-in-file',
        '51:10-51:38 warning Cannot find file `examples/world.md`                                           missing-file            remark-validate-links:missing-file',
        '51:10-51:38 warning Cannot find heading for `#hello` in `examples/world.md`                        missing-heading-in-file remark-validate-links:missing-heading-in-file',
        '',
        '⚠ 16 warnings',
        ''
      ].join('\n')
    )
  })

  await t.test('should work with definitions', async function () {
    const result = await exec(
      [
        binary,
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
      stripAnsi(result.stderr),
      [
        'definitions.md',
        '10:1-10:18 warning Cannot find heading for `#world` missing-heading remark-validate-links:missing-heading',
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
          binary,
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
        stripAnsi(result.stderr),
        [
          'examples/github.md',
          '5:37-5:51    warning Cannot find heading for `#world`                         missing-heading         remark-validate-links:missing-heading',
          '15:34-15:91  warning Cannot find file `../world.md`                           missing-file            remark-validate-links:missing-file',
          '17:12-17:72  warning Cannot find file `../world.md`                           missing-file            remark-validate-links:missing-file',
          '19:10-19:29  warning Cannot find file `../world.md`                           missing-file            remark-validate-links:missing-file',
          '29:10-29:33  warning Cannot find heading for `#world` in `../github.md`       missing-heading-in-file remark-validate-links:missing-heading-in-file',
          '31:10-31:71  warning Cannot find heading for `#world` in `../github.md`       missing-heading-in-file remark-validate-links:missing-heading-in-file',
          '33:10-33:74  warning Cannot find heading for `#world` in `../github.md`       missing-heading-in-file remark-validate-links:missing-heading-in-file',
          '35:10-35:32  warning Cannot find file `../world.md`                           missing-file            remark-validate-links:missing-file',
          '35:10-35:32  warning Cannot find heading for `#hello` in `../world.md`        missing-heading-in-file remark-validate-links:missing-heading-in-file',
          '37:10-37:70  warning Cannot find file `../world.md`                           missing-file            remark-validate-links:missing-file',
          '37:10-37:70  warning Cannot find heading for `#hello` in `../world.md`        missing-heading-in-file remark-validate-links:missing-heading-in-file',
          '39:10-39:73  warning Cannot find file `../world.md`                           missing-file            remark-validate-links:missing-file',
          '39:10-39:73  warning Cannot find heading for `#hello` in `../world.md`        missing-heading-in-file remark-validate-links:missing-heading-in-file',
          '',
          'github.md',
          '5:37-5:51    warning Cannot find heading for `#world`                         missing-heading         remark-validate-links:missing-heading',
          '21:34-21:100 warning Cannot find file `examples/world.md`                     missing-file            remark-validate-links:missing-file',
          '23:34-23:60  warning Cannot find file `examples/world.md`                     missing-file            remark-validate-links:missing-file',
          '25:12-25:81  warning Cannot find file `examples/world.md`                     missing-file            remark-validate-links:missing-file',
          '27:10-27:37  warning Cannot find file `examples/world.md`                     missing-file            remark-validate-links:missing-file',
          '29:10-29:35  warning Cannot find file `examples/world.md`                     missing-file            remark-validate-links:missing-file',
          '41:10-41:41  warning Cannot find heading for `#world` in `examples/github.md` missing-heading-in-file remark-validate-links:missing-heading-in-file',
          '43:10-43:39  warning Cannot find heading for `#world` in `examples/github.md` missing-heading-in-file remark-validate-links:missing-heading-in-file',
          '45:10-45:80  warning Cannot find heading for `#world` in `examples/github.md` missing-heading-in-file remark-validate-links:missing-heading-in-file',
          '47:10-47:83  warning Cannot find heading for `#world` in `examples/github.md` missing-heading-in-file remark-validate-links:missing-heading-in-file',
          '49:10-49:40  warning Cannot find file `examples/world.md`                     missing-file            remark-validate-links:missing-file',
          '49:10-49:40  warning Cannot find heading for `#hello` in `examples/world.md`  missing-heading-in-file remark-validate-links:missing-heading-in-file',
          '51:10-51:38  warning Cannot find file `examples/world.md`                     missing-file            remark-validate-links:missing-file',
          '51:10-51:38  warning Cannot find heading for `#hello` in `examples/world.md`  missing-heading-in-file remark-validate-links:missing-heading-in-file',
          '53:10-53:79  warning Cannot find file `examples/world.md`                     missing-file            remark-validate-links:missing-file',
          '53:10-53:79  warning Cannot find heading for `#hello` in `examples/world.md`  missing-heading-in-file remark-validate-links:missing-heading-in-file',
          '55:10-55:82  warning Cannot find file `examples/world.md`                     missing-file            remark-validate-links:missing-file',
          '55:10-55:82  warning Cannot find heading for `#hello` in `examples/world.md`  missing-heading-in-file remark-validate-links:missing-heading-in-file',
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
        binary,
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
      stripAnsi(result.stderr),
      [
        'examples/github.md',
        '5:37-5:51    warning Cannot find heading for `#world`                         missing-heading         remark-validate-links:missing-heading',
        '15:34-15:91  warning Cannot find file `../world.md`                           missing-file            remark-validate-links:missing-file',
        '17:12-17:72  warning Cannot find file `../world.md`                           missing-file            remark-validate-links:missing-file',
        '19:10-19:29  warning Cannot find file `../world.md`                           missing-file            remark-validate-links:missing-file',
        '29:10-29:33  warning Cannot find heading for `#world` in `../github.md`       missing-heading-in-file remark-validate-links:missing-heading-in-file',
        '31:10-31:71  warning Cannot find heading for `#world` in `../github.md`       missing-heading-in-file remark-validate-links:missing-heading-in-file',
        '33:10-33:74  warning Cannot find heading for `#world` in `../github.md`       missing-heading-in-file remark-validate-links:missing-heading-in-file',
        '35:10-35:32  warning Cannot find file `../world.md`                           missing-file            remark-validate-links:missing-file',
        '35:10-35:32  warning Cannot find heading for `#hello` in `../world.md`        missing-heading-in-file remark-validate-links:missing-heading-in-file',
        '37:10-37:70  warning Cannot find file `../world.md`                           missing-file            remark-validate-links:missing-file',
        '37:10-37:70  warning Cannot find heading for `#hello` in `../world.md`        missing-heading-in-file remark-validate-links:missing-heading-in-file',
        '39:10-39:73  warning Cannot find file `../world.md`                           missing-file            remark-validate-links:missing-file',
        '39:10-39:73  warning Cannot find heading for `#hello` in `../world.md`        missing-heading-in-file remark-validate-links:missing-heading-in-file',
        '',
        'github.md',
        '5:37-5:51    warning Cannot find heading for `#world`                         missing-heading         remark-validate-links:missing-heading',
        '21:34-21:100 warning Cannot find file `examples/world.md`                     missing-file            remark-validate-links:missing-file',
        '23:34-23:60  warning Cannot find file `examples/world.md`                     missing-file            remark-validate-links:missing-file',
        '25:12-25:81  warning Cannot find file `examples/world.md`                     missing-file            remark-validate-links:missing-file',
        '27:10-27:37  warning Cannot find file `examples/world.md`                     missing-file            remark-validate-links:missing-file',
        '29:10-29:35  warning Cannot find file `examples/world.md`                     missing-file            remark-validate-links:missing-file',
        '41:10-41:41  warning Cannot find heading for `#world` in `examples/github.md` missing-heading-in-file remark-validate-links:missing-heading-in-file',
        '43:10-43:39  warning Cannot find heading for `#world` in `examples/github.md` missing-heading-in-file remark-validate-links:missing-heading-in-file',
        '45:10-45:80  warning Cannot find heading for `#world` in `examples/github.md` missing-heading-in-file remark-validate-links:missing-heading-in-file',
        '47:10-47:83  warning Cannot find heading for `#world` in `examples/github.md` missing-heading-in-file remark-validate-links:missing-heading-in-file',
        '49:10-49:40  warning Cannot find file `examples/world.md`                     missing-file            remark-validate-links:missing-file',
        '49:10-49:40  warning Cannot find heading for `#hello` in `examples/world.md`  missing-heading-in-file remark-validate-links:missing-heading-in-file',
        '51:10-51:38  warning Cannot find file `examples/world.md`                     missing-file            remark-validate-links:missing-file',
        '51:10-51:38  warning Cannot find heading for `#hello` in `examples/world.md`  missing-heading-in-file remark-validate-links:missing-heading-in-file',
        '53:10-53:79  warning Cannot find file `examples/world.md`                     missing-file            remark-validate-links:missing-file',
        '53:10-53:79  warning Cannot find heading for `#hello` in `examples/world.md`  missing-heading-in-file remark-validate-links:missing-heading-in-file',
        '55:10-55:82  warning Cannot find file `examples/world.md`                     missing-file            remark-validate-links:missing-file',
        '55:10-55:82  warning Cannot find heading for `#hello` in `examples/world.md`  missing-heading-in-file remark-validate-links:missing-heading-in-file',
        '',
        '⚠ 31 warnings',
        ''
      ].join('\n')
    )
  })

  await t.test('should fail w/o Git repository', async function () {
    await fs.rm('./.git', {force: true, recursive: true})
    await fs.rename(gitUrl, gitBakUrl)

    try {
      await exec(
        [
          binary,
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
      assert.match(String(cause), /not a git repository/i)
    } finally {
      await fs.rename(gitBakUrl, gitUrl)
    }
  })

  await t.test('should fail w/o Git repository w/o remote', async function () {
    await exec('git init')

    try {
      await exec(
        [
          binary,
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
      assert.match(
        String(cause),
        /Cannot find remote `origin` of local Git repo/
      )
    }
  })

  await t.test('should work w/o Git repository w/ repo', async function () {
    await fs.rename(gitUrl, gitBakUrl)

    const result = await exec(
      [
        binary,
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
      stripAnsi(result.stderr),
      [
        'small.md',
        '5:13-5:27 warning Cannot find heading for `#world` missing-heading remark-validate-links:missing-heading',
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
        binary,
        '--no-config',
        '--no-ignore',
        '--use',
        '"../../index.js=repository:{remote:\\"wooorm/test\\"}"',
        'small.md'
      ].join(' ')
    )

    await fs.rename(gitBakUrl, gitUrl)

    assert.equal(
      stripAnsi(result.stderr),
      [
        'small.md',
        '5:13-5:27 warning Cannot find heading for `#world` missing-heading remark-validate-links:missing-heading',
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
          binary,
          '--no-config',
          '--no-ignore',
          '--use',
          '"../../index.js=repository:\\"wooorm/test\\",root:\\"../\\""',
          'small.md'
        ].join(' ')
      )

      await fs.rename(gitBakUrl, gitUrl)

      assert.equal(
        stripAnsi(result.stderr),
        [
          'small.md',
          '5:13-5:27 warning Cannot find heading for `#world` missing-heading remark-validate-links:missing-heading',
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
        binary,
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
      stripAnsi(result.stderr),
      [
        'examples/github.md',
        '5:37-5:51   warning Cannot find heading for `#world`                         missing-heading         remark-validate-links:missing-heading',
        '19:10-19:29 warning Cannot find file `../world.md`                           missing-file            remark-validate-links:missing-file',
        '29:10-29:33 warning Cannot find heading for `#world` in `../github.md`       missing-heading-in-file remark-validate-links:missing-heading-in-file',
        '35:10-35:32 warning Cannot find file `../world.md`                           missing-file            remark-validate-links:missing-file',
        '35:10-35:32 warning Cannot find heading for `#hello` in `../world.md`        missing-heading-in-file remark-validate-links:missing-heading-in-file',
        '',
        'github.md',
        '5:37-5:51   warning Cannot find heading for `#world`                         missing-heading         remark-validate-links:missing-heading',
        '27:10-27:37 warning Cannot find file `examples/world.md`                     missing-file            remark-validate-links:missing-file',
        '29:10-29:35 warning Cannot find file `examples/world.md`                     missing-file            remark-validate-links:missing-file',
        '41:10-41:41 warning Cannot find heading for `#world` in `examples/github.md` missing-heading-in-file remark-validate-links:missing-heading-in-file',
        '43:10-43:39 warning Cannot find heading for `#world` in `examples/github.md` missing-heading-in-file remark-validate-links:missing-heading-in-file',
        '49:10-49:40 warning Cannot find file `examples/world.md`                     missing-file            remark-validate-links:missing-file',
        '49:10-49:40 warning Cannot find heading for `#hello` in `examples/world.md`  missing-heading-in-file remark-validate-links:missing-heading-in-file',
        '51:10-51:38 warning Cannot find file `examples/world.md`                     missing-file            remark-validate-links:missing-file',
        '51:10-51:38 warning Cannot find heading for `#hello` in `examples/world.md`  missing-heading-in-file remark-validate-links:missing-heading-in-file',
        '71:41-71:56 warning Cannot find heading for `#readme`                        missing-heading         remark-validate-links:missing-heading',
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
          binary,
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
        stripAnsi(result.stderr),
        [
          'small.md',
          '5:13-5:27 warning Cannot find heading for `#world` missing-heading remark-validate-links:missing-heading',
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
        binary,
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
      stripAnsi(result.stderr),
      [
        'gitlab.md',
        '5:37-5:51    warning Cannot find heading for `#world`                                        missing-heading         remark-validate-links:missing-heading',
        '21:34-21:100 warning Cannot find file `examples/world.md`; did you mean `examples/gitlab.md` missing-file            remark-validate-links:missing-file',
        '23:12-23:81  warning Cannot find file `examples/world.md`; did you mean `examples/gitlab.md` missing-file            remark-validate-links:missing-file',
        '25:10-25:37  warning Cannot find file `examples/world.md`; did you mean `examples/gitlab.md` missing-file            remark-validate-links:missing-file',
        '27:10-27:35  warning Cannot find file `examples/world.md`; did you mean `examples/gitlab.md` missing-file            remark-validate-links:missing-file',
        '39:10-39:41  warning Cannot find heading for `#world` in `examples/gitlab.md`                missing-heading-in-file remark-validate-links:missing-heading-in-file',
        '41:10-41:39  warning Cannot find heading for `#world` in `examples/gitlab.md`                missing-heading-in-file remark-validate-links:missing-heading-in-file',
        '43:10-43:80  warning Cannot find heading for `#world` in `examples/gitlab.md`                missing-heading-in-file remark-validate-links:missing-heading-in-file',
        '45:10-45:83  warning Cannot find heading for `#world` in `examples/gitlab.md`                missing-heading-in-file remark-validate-links:missing-heading-in-file',
        '47:10-47:40  warning Cannot find file `examples/world.md`; did you mean `examples/gitlab.md` missing-file            remark-validate-links:missing-file',
        '47:10-47:40  warning Cannot find heading for `#hello` in `examples/world.md`                 missing-heading-in-file remark-validate-links:missing-heading-in-file',
        '49:10-49:38  warning Cannot find file `examples/world.md`; did you mean `examples/gitlab.md` missing-file            remark-validate-links:missing-file',
        '49:10-49:38  warning Cannot find heading for `#hello` in `examples/world.md`                 missing-heading-in-file remark-validate-links:missing-heading-in-file',
        '51:10-51:79  warning Cannot find file `examples/world.md`; did you mean `examples/gitlab.md` missing-file            remark-validate-links:missing-file',
        '51:10-51:79  warning Cannot find heading for `#hello` in `examples/world.md`                 missing-heading-in-file remark-validate-links:missing-heading-in-file',
        '53:10-53:82  warning Cannot find file `examples/world.md`; did you mean `examples/gitlab.md` missing-file            remark-validate-links:missing-file',
        '53:10-53:82  warning Cannot find heading for `#hello` in `examples/world.md`                 missing-heading-in-file remark-validate-links:missing-heading-in-file',
        '',
        '⚠ 17 warnings',
        ''
      ].join('\n')
    )
  })

  await t.test('should support a Bitbucket shortcode', async function () {
    const result = await exec(
      [
        binary,
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
      stripAnsi(result.stderr),
      [
        'bitbucket.md',
        '5:37-5:67    warning Cannot find heading for `#world`                            missing-heading         remark-validate-links:missing-heading',
        '21:34-21:102 warning Cannot find file `examples/world.md`                        missing-file            remark-validate-links:missing-file',
        '23:12-23:83  warning Cannot find file `examples/world.md`                        missing-file            remark-validate-links:missing-file',
        '25:10-25:37  warning Cannot find file `examples/world.md`                        missing-file            remark-validate-links:missing-file',
        '27:10-27:35  warning Cannot find file `examples/world.md`                        missing-file            remark-validate-links:missing-file',
        '39:10-39:60  warning Cannot find heading for `#world` in `examples/bitbucket.md` missing-heading-in-file remark-validate-links:missing-heading-in-file',
        '41:10-41:58  warning Cannot find heading for `#world` in `examples/bitbucket.md` missing-heading-in-file remark-validate-links:missing-heading-in-file',
        '43:10-43:101 warning Cannot find heading for `#world` in `examples/bitbucket.md` missing-heading-in-file remark-validate-links:missing-heading-in-file',
        '45:10-45:104 warning Cannot find heading for `#world` in `examples/bitbucket.md` missing-heading-in-file remark-validate-links:missing-heading-in-file',
        '47:10-47:56  warning Cannot find file `examples/world.md`                        missing-file            remark-validate-links:missing-file',
        '47:10-47:56  warning Cannot find heading for `#hello` in `examples/world.md`     missing-heading-in-file remark-validate-links:missing-heading-in-file',
        '49:10-49:54  warning Cannot find file `examples/world.md`                        missing-file            remark-validate-links:missing-file',
        '49:10-49:54  warning Cannot find heading for `#hello` in `examples/world.md`     missing-heading-in-file remark-validate-links:missing-heading-in-file',
        '51:10-51:97  warning Cannot find file `examples/world.md`                        missing-file            remark-validate-links:missing-file',
        '51:10-51:97  warning Cannot find heading for `#hello` in `examples/world.md`     missing-heading-in-file remark-validate-links:missing-heading-in-file',
        '53:10-53:100 warning Cannot find file `examples/world.md`                        missing-file            remark-validate-links:missing-file',
        '53:10-53:100 warning Cannot find heading for `#hello` in `examples/world.md`     missing-heading-in-file remark-validate-links:missing-heading-in-file',
        '',
        '⚠ 17 warnings',
        ''
      ].join('\n')
    )
  })

  await t.test('should suggest similar links', async function () {
    const result = await exec(
      [
        binary,
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
      stripAnsi(result.stderr),
      [
        'suggestions.md',
        '3:22-3:37 warning Cannot find heading for `#helloo`; did you mean `hello`                 missing-heading         remark-validate-links:missing-heading',
        '7:17-7:39 warning Cannot find heading for `#fiiiles` in `github.md`; did you mean `files` missing-heading-in-file remark-validate-links:missing-heading-in-file',
        '',
        '⚠ 2 warnings',
        ''
      ].join('\n')
    )
  })

  await t.test('should recognise links to particular lines', async function () {
    const result = await exec(
      [
        binary,
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
      stripAnsi(result.stderr),
      [
        'line-links.md',
        '5:9-5:61 warning Cannot find file `examples/missing.js` missing-file remark-validate-links:missing-file',
        '9:1-9:69 warning Cannot find file `examples/missing.js` missing-file remark-validate-links:missing-file',
        '',
        '⚠ 2 warnings',
        ''
      ].join('\n')
    )
  })

  await t.test('should recognise links with encoded URLs', async function () {
    const result = await exec(
      [
        binary,
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
      stripAnsi(result.stderr),
      [
        'weird-characters.md',
        '11:17-11:87  warning Cannot find file `examples/missing#characters.md`; did you mean `examples/weird#characters.md`             missing-file            remark-validate-links:missing-file',
        '13:17-13:93  warning Cannot find file `examples/missing#character/readme.md`; did you mean `examples/weird#character/readme.md` missing-file            remark-validate-links:missing-file',
        '15:17-15:114 warning Cannot find heading for `#world` in `examples/weird#characters.md`                                         missing-heading-in-file remark-validate-links:missing-heading-in-file',
        '17:17-17:120 warning Cannot find heading for `#world` in `examples/weird#character/readme.md`                                   missing-heading-in-file remark-validate-links:missing-heading-in-file',
        '',
        '⚠ 4 warnings',
        ''
      ].join('\n')
    )
  })

  await t.test('should support folders', async function () {
    const result = await exec(
      [
        binary,
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
      stripAnsi(result.stderr),
      [
        'folder.md',
        '9:1-9:40   warning Cannot find heading for `#missing` in `folder/readme.markdown` missing-heading-in-file remark-validate-links:missing-heading-in-file',
        '17:1-17:24 warning Cannot find heading for `#missing` in `folder`                 missing-heading-in-file remark-validate-links:missing-heading-in-file',
        '21:1-21:25 warning Cannot find file `missing`                                     missing-file            remark-validate-links:missing-file',
        '21:1-21:25 warning Cannot find heading for `#missing` in `missing`                missing-heading-in-file remark-validate-links:missing-heading-in-file',
        '23:1-23:39 warning Cannot find heading for `#missing` in `folder-without-readme`  missing-heading-in-file remark-validate-links:missing-heading-in-file',
        '',
        '⚠ 5 warnings',
        ''
      ].join('\n')
    )
  })

  await t.test('should warn on files as folders', async function () {
    const result = await exec(
      [
        binary,
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
      stripAnsi(result.stderr),
      [
        'file-as-folder.md',
        '1:1-1:28 warning Cannot find file `file-as-folder.md/other`; did you mean `file-as-folder.md` missing-file remark-validate-links:missing-file',
        '',
        '⚠ 1 warning',
        ''
      ].join('\n')
    )
  })

  await t.test('should check images', async function () {
    const result = await exec(
      [
        binary,
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
      stripAnsi(result.stderr),
      [
        'images.md',
        '21:10-21:50 warning Cannot find file `examples/missing.jpg`; did you mean `examples/image.jpg` missing-file remark-validate-links:missing-file',
        '23:12-23:42 warning Cannot find file `examples/missing.jpg`; did you mean `examples/image.jpg` missing-file remark-validate-links:missing-file',
        '25:10-25:89 warning Cannot find file `examples/missing.jpg`; did you mean `examples/image.jpg` missing-file remark-validate-links:missing-file',
        '37:1-37:38  warning Cannot find file `examples/missing.jpg`; did you mean `examples/image.jpg` missing-file remark-validate-links:missing-file',
        '39:1-39:77  warning Cannot find file `examples/missing.jpg`; did you mean `examples/image.jpg` missing-file remark-validate-links:missing-file',
        '',
        '⚠ 5 warnings',
        ''
      ].join('\n')
    )
  })

  await t.test('should slug image alts correctly', async function () {
    const result = await exec(
      [
        binary,
        '--no-config',
        '--no-ignore',
        '--use',
        '"../../index.js=repository:\\"wooorm/test\\""',
        '--use',
        '../sort.js',
        'image-alts.md'
      ].join(' ')
    )

    assert.equal(stripAnsi(result.stderr), 'image-alts.md: no issues found\n')
  })

  await t.test('should support query parameters', async function () {
    const result = await exec(
      [
        binary,
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
      stripAnsi(result.stderr),
      [
        'query-params.md',
        '11:33-11:55 warning Cannot find heading for `#query-params?`; did you mean `query-params` missing-heading remark-validate-links:missing-heading',
        '',
        '⚠ 1 warning',
        ''
      ].join('\n')
    )
  })

  await t.test('should support case insensitive headings', async function () {
    const result = await exec(
      [
        binary,
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
      stripAnsi(result.stderr),
      [
        'case-insensitive-headings.md',
        '5:13-5:27 warning Cannot find heading for `#world`                         missing-heading         remark-validate-links:missing-heading',
        '9:16-9:48 warning Cannot find heading for `#world` in `examples/github.md` missing-heading-in-file remark-validate-links:missing-heading-in-file',
        '',
        '⚠ 2 warnings',
        ''
      ].join('\n')
    )
  })

  await t.test('should ignore external links', async function () {
    const result = await exec(
      [
        binary,
        '--no-config',
        '--no-ignore',
        '--use',
        '"../../index.js=repository:\\"wooorm/test\\""',
        '--use',
        '../sort.js',
        'external.md'
      ].join(' ')
    )

    assert.equal(stripAnsi(result.stderr), 'external.md: no issues found\n')
  })

  await t.test(
    'should ignore external links (without repo)',
    async function () {
      const result = await exec(
        [
          binary,
          '--no-config',
          '--no-ignore',
          '--use',
          '../../index.js=repository:false',
          '--use',
          '../sort.js',
          'external.md'
        ].join(' ')
      )

      assert.equal(stripAnsi(result.stderr), 'external.md: no issues found\n')
    }
  )

  await t.test('should support self-hosted Git solutions', async function () {
    await exec('git init')
    await exec('git remote add origin git@gitlab.acme.company:acme/project.git')
    const result = await exec(
      [
        binary,
        '--no-config',
        '--no-ignore',
        '--use',
        '"../../index.js=urlConfig:{hostname:\\"gitlab.acme.com\\",prefix:\\"/acme/project/blob/\\",headingPrefix:\\"#\\",lines:true}"',
        'self-hosted.md'
      ].join(' ')
    )

    assert.equal(
      stripAnsi(result.stderr),
      [
        'self-hosted.md',
        '5:1-5:80 warning Cannot find heading for `#world` missing-heading remark-validate-links:missing-heading',
        '',
        '⚠ 1 warning',
        ''
      ].join('\n')
    )
  })

  await fs.rm('./.git', {recursive: true, force: true})

  process.chdir(fileURLToPath(baseUrl))
})

// From `unified-engine`.
/**
 * Clean an error so that it’s easier to test.
 *
 * This particularly removed error cause messages, which change across Node
 * versions.
 * It also drops file paths, which differ across platforms.
 *
 * @param {string} value
 *   Error, report, or stack.
 * @param {number | undefined} [max=Infinity]
 *   Lines to include.
 * @returns {string}
 *   Clean error.
 */
function cleanError(value, max) {
  return (
    value
      // Clean syscal errors
      .replace(/( *Error: [A-Z]+:)[^\n]*/g, '$1…')

      .replace(/\(.+[/\\]/g, '(')
      .replace(/file:.+\//g, '')
      .replace(/\d+:\d+/g, '1:1')
      .split('\n')
      .slice(0, max || Number.POSITIVE_INFINITY)
      .join('\n')
  )
}
