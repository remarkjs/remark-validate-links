import {remark} from 'remark'
import test from 'tape'
import {engine as engineCb} from 'unified-engine'
import {promisify} from 'node:util'
import {VFile} from 'vfile'
import remarkValidateLinks from '../index.js'

const engine = promisify(engineCb)

// Should ignore links to other branches.
const options = {repository: 'https://github.com/wooorm/test.git#main'}

test('same branch, working link', async (t) => {
  t.deepEqual(
    await process(
      '[](https://github.com/wooorm/test/blob/main/examples/github.md#hello)'
    ),
    [],
    'nothing to report'
  )
})

test('other branch, working link', async (t) => {
  t.deepEqual(
    await process(
      '[](https://github.com/wooorm/test/blob/foo-bar/examples/github.md#hello)'
    ),
    [],
    'nothing to ignore'
  )
})

test('same branch, no such heading', async (t) => {
  t.deepEqual(
    await process(
      '[](https://github.com/wooorm/test/blob/main/examples/github.md#world)'
    ),
    [
      'input.md:1:1-1:70: Link to unknown heading in `examples/github.md`: `world`'
    ],
    'should be reported'
  )
})

test('other branch, no such heading', async (t) => {
  t.deepEqual(
    await process(
      '[](https://github.com/wooorm/test/blob/foo-bar/examples/github.md#world)'
    ),
    [],
    'should be ignored'
  )
})

test('same branch, no such file', async (t) => {
  t.deepEqual(
    await process(
      '[](https://github.com/wooorm/test/blob/main/examples/world.md#hello)'
    ),
    [
      'input.md:1:1-1:69: Link to unknown file: `examples/world.md`',
      'input.md:1:1-1:69: Link to unknown heading in `examples/world.md`: `hello`'
    ],
    'should be reported'
  )
})

test('other branch, no such file', async (t) => {
  t.deepEqual(
    await process(
      '[](https://github.com/wooorm/test/blob/foo-bar/examples/world.md#hello)'
    ),
    [],
    'should be ignored'
  )
})

/**
 * Run the plugin on a markdown test case and return a list of stringified messages.
 * unified-engine is needed to cross-reference links between files, by creating a FileSet.
 *
 * @param {string} value
 */
async function process(value) {
  const file = new VFile({value, path: 'input.md'})
  await engine({
    processor: remark,
    files: [file],
    plugins: [[remarkValidateLinks, options]],
    silent: true
  })
  return file.messages.map((message) => String(message))
}
