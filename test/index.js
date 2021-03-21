'use strict'

var fs = require('fs')
var path = require('path')
var childProcess = require('child_process')
var test = require('tape')
var vfile = require('to-vfile')
var remark = require('remark')
var strip = require('strip-ansi')
var rimraf = require('rimraf')
var sort = require('./sort')
var links = require('..')

process.chdir(path.resolve(process.cwd(), 'test', 'fixtures'))

test.onFinish(function () {
  process.chdir(path.resolve(process.cwd(), '..', '..'))
})

var bin = path.join('..', '..', 'node_modules', '.bin', 'remark')

test('remark-validate-links', function (t) {
  t.test('should work on the API', function (st) {
    st.plan(1)

    remark()
      .use(links)
      .use(sort)
      .process(vfile.readSync('github.md'), function (error, file) {
        st.deepEqual(
          [error].concat(file.messages.map(String)),
          [
            null,
            'github.md:5:37-5:51: Link to unknown heading: `world`',
            'github.md:27:10-27:37: Link to unknown file: `examples/world.md`',
            'github.md:29:10-29:35: Link to unknown file: `examples/world.md`',
            'github.md:49:10-49:40: Link to unknown file: `examples/world.md`',
            'github.md:51:10-51:38: Link to unknown file: `examples/world.md`'
          ],
          'should report messages'
        )
      })
  })

  t.test(
    'should support landmarks and references to prototypal values',
    function (st) {
      st.plan(1)

      remark()
        .use(links)
        .use(sort)
        .process(
          '# \\_\\_proto__\n# constructor\n# toString\n[](#__proto__), [](#constructor), [](#toString)',
          function (error, file) {
            st.deepEqual(
              [
                error,
                Object.keys(file.data.remarkValidateLinksLandmarks['']),
                Object.keys(file.data.remarkValidateLinksReferences['']),
                file.messages
              ],
              [
                null,
                ['', '__proto__', 'constructor', 'tostring'],
                ['', '__proto__', 'constructor', 'tostring'],
                []
              ],
              'should work'
            )
          }
        )
    }
  )

  t.test('should ignore invalid repositories', function (st) {
    st.plan(1)

    childProcess.exec(
      [
        bin,
        '--no-config',
        '--no-ignore',
        '--use',
        '"../..=repository:\\"invalid:shortcode\\""',
        '--use',
        '../sort',
        'small.md'
      ].join(' '),
      onexec
    )

    function onexec(error, stdout, stderr) {
      st.deepEqual(
        [error, strip(stderr)],
        [
          null,
          [
            'small.md',
            '  5:13-5:27  warning  Link to unknown heading: `world`  missing-heading  remark-validate-links',
            '',
            '⚠ 1 warning',
            ''
          ].join('\n')
        ],
        'should work'
      )
    }
  })

  t.test('should throw on Gist repositories', function (st) {
    st.plan(1)

    childProcess.exec(
      [
        bin,
        '--no-config',
        '--no-ignore',
        '--use',
        '"../..=repository:\\"gist:wooorm/8504606\\""',
        '--use',
        '../sort',
        'small.md'
      ].join(' '),
      onexec
    )

    function onexec(error, stdout, stderr) {
      st.deepEqual(
        [error, strip(stderr)],
        [
          null,
          [
            'small.md',
            '  5:13-5:27  warning  Link to unknown heading: `world`  missing-heading  remark-validate-links',
            '',
            '⚠ 1 warning',
            ''
          ].join('\n')
        ],
        'should work'
      )
    }
  })

  t.test('should ignore unfound files (#1)', function (st) {
    st.plan(1)

    childProcess.exec(
      [
        bin,
        '--no-config',
        '--no-ignore',
        '--use',
        '../..',
        '--use',
        '../sort',
        'FOOOO'
      ].join(' '),
      onexec
    )

    function onexec(error, stdout, stderr) {
      st.deepEqual(
        [/command failed/i.test(error), strip(stderr)],
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
        'should work'
      )
    }
  })

  t.test('should ignore unfound files (#2)', function (st) {
    st.plan(1)

    childProcess.exec(
      [
        bin,
        '--no-config',
        '--no-ignore',
        '--use',
        '../..',
        '--use',
        '../sort',
        'definitions.md',
        'FOOOO'
      ].join(' '),
      onexec
    )

    function onexec(error, stdout, stderr) {
      st.deepEqual(
        [/command failed/i.test(error), strip(stderr)],
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
        'should work'
      )
    }
  })

  t.test('should work if there are no links', function (st) {
    st.plan(1)

    childProcess.exec(
      [
        bin,
        '--no-config',
        '--no-ignore',
        '--use',
        '../..',
        '--use',
        '../sort',
        'empty.md'
      ].join(' '),
      onexec
    )

    function onexec(error, stdout, stderr) {
      st.deepEqual(
        [error, strip(stderr)],
        [null, 'empty.md: no issues found\n'],
        'should work'
      )
    }
  })

  t.test('should work with stdin', function (st) {
    st.plan(1)

    var subprocess = childProcess.exec(
      [
        bin,
        '--no-config',
        '--no-ignore',
        '--use',
        '../..',
        '--use',
        '../sort'
      ].join(' '),
      onexec
    )

    fs.createReadStream('github.md').pipe(subprocess.stdin)

    function onexec(error, stdout, stderr) {
      st.deepEqual(
        [error, strip(stderr)],
        [
          null,
          [
            '<stdin>',
            '  5:37-5:51  warning  Link to unknown heading: `world`  missing-heading  remark-validate-links',
            '',
            '⚠ 1 warning',
            ''
          ].join('\n')
        ],
        'should work'
      )
    }
  })

  t.test('should work when not all files are given', function (st) {
    st.plan(1)

    childProcess.exec(
      [
        bin,
        '--no-config',
        '--no-ignore',
        '--use',
        '../..',
        '--use',
        '../sort',
        'github.md'
      ].join(' '),
      onexec
    )

    function onexec(error, stdout, stderr) {
      st.deepEqual(
        [error, strip(stderr)],
        [
          null,
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
        ],
        'should work'
      )
    }
  })

  t.test('should work when all files are given', function (st) {
    st.plan(1)

    childProcess.exec(
      [
        bin,
        '--no-config',
        '--no-ignore',
        '--use',
        '../..',
        '--use',
        '../sort',
        'github.md',
        'examples/github.md'
      ].join(' '),
      onexec
    )

    function onexec(error, stdout, stderr) {
      st.deepEqual(
        [error, strip(stderr)],
        [
          null,
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
        ],
        'should work'
      )
    }
  })

  t.test('should work with definitions', function (st) {
    st.plan(1)

    childProcess.exec(
      [
        bin,
        '--no-config',
        '--no-ignore',
        '--use',
        '../..',
        '--use',
        '../sort',
        'definitions.md'
      ].join(' '),
      onexec
    )

    function onexec(error, stdout, stderr) {
      st.deepEqual(
        [error, strip(stderr)],
        [
          null,
          [
            'definitions.md',
            '  10:1-10:18  warning  Link to unknown heading: `world`  missing-heading  remark-validate-links',
            '',
            '⚠ 1 warning',
            ''
          ].join('\n')
        ],
        'should work'
      )
    }
  })

  t.test('should work on GitHub URLs when given a repo', function (st) {
    st.plan(1)

    childProcess.exec(
      [
        bin,
        '--no-config',
        '--no-ignore',
        '--use',
        '"../..=repository:\\"wooorm/test\\""',
        '--use',
        '../sort',
        'github.md',
        'examples/github.md'
      ].join(' '),
      onexec
    )

    function onexec(error, stdout, stderr) {
      st.deepEqual(
        [error, strip(stderr)],
        [
          null,
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
        ],
        'should work'
      )
    }
  })

  t.test('should work when with Git directory', function (st) {
    st.plan(1)

    childProcess.exec('git init', oninit)

    function oninit(error) {
      if (error) {
        t.ifErr(error)
      } else {
        childProcess.exec(
          'git remote add origin git@github.com:wooorm/test.git',
          onremote
        )
      }
    }

    function onremote(error) {
      if (error) {
        clean()
        t.ifErr(error)
      } else {
        childProcess.exec(
          [
            bin,
            '--no-config',
            '--no-ignore',
            '--use',
            '../..',
            '--use',
            '../sort',
            'github.md',
            'examples/github.md'
          ].join(' '),
          onexec
        )
      }
    }

    function onexec(error, stdout, stderr) {
      clean()
      st.deepEqual(
        [error, strip(stderr)],
        [
          null,
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
        ],
        'should work'
      )
    }

    function clean() {
      rimraf.sync('./.git')
    }
  })

  t.test('should fail w/o Git repository', function (st) {
    st.plan(1)

    fs.renameSync('../../.git', '../../.git.bak')

    childProcess.exec(
      [
        bin,
        '--no-config',
        '--no-ignore',
        '--use',
        '../..',
        '--use',
        '../sort',
        'github.md'
      ].join(' '),
      onexec
    )

    function onexec(error) {
      fs.renameSync('../../.git.bak', '../../.git')
      st.ok(/not a git repository/i.test(error), 'should fail')
    }
  })

  t.test('should fail w/o Git repository w/o remote', function (st) {
    st.plan(1)

    childProcess.exec('git init', oninit)

    function oninit(error) {
      if (error) {
        t.ifErr(error)
      } else {
        childProcess.exec(
          [
            bin,
            '--no-config',
            '--no-ignore',
            '--use',
            '../..',
            'github.md'
          ].join(' '),
          onexec
        )
      }
    }

    function onexec(error) {
      rimraf.sync('./.git')
      st.ok(/Could not find remote origin/.test(error), 'should fail')
    }
  })

  t.test('should work w/o Git repository w/ repo', function (st) {
    st.plan(1)

    fs.renameSync('../../.git', '../../.git.bak')

    childProcess.exec(
      [
        bin,
        '--no-config',
        '--no-ignore',
        '--use',
        '"../..=repository:\\"wooorm/test\\""',
        '--use',
        '../sort',
        'small.md'
      ].join(' '),
      onexec
    )

    function onexec(error, stdout, stderr) {
      fs.renameSync('../../.git.bak', '../../.git')
      st.deepEqual(
        [error, strip(stderr)],
        [
          null,
          [
            'small.md',
            '  5:13-5:27  warning  Link to unknown heading: `world`  missing-heading  remark-validate-links',
            '',
            '⚠ 1 warning',
            ''
          ].join('\n')
        ],
        'should work'
      )
    }
  })

  t.test('should work w/o Git repository w/ remote', function (st) {
    st.plan(1)

    fs.renameSync('../../.git', '../../.git.bak')

    childProcess.exec(
      [
        bin,
        '--no-config',
        '--no-ignore',
        '--use',
        '"../..=repository:{remote:\\"wooorm/test\\"}"',
        'small.md'
      ].join(' '),
      onexec
    )

    function onexec(error, stdout, stderr) {
      fs.renameSync('../../.git.bak', '../../.git')
      st.deepEqual(
        [error, strip(stderr)],
        [
          null,
          [
            'small.md',
            '  5:13-5:27  warning  Link to unknown heading: `world`  missing-heading  remark-validate-links',
            '',
            '⚠ 1 warning',
            ''
          ].join('\n')
        ],
        'should work'
      )
    }
  })

  t.test('should work w/o Git repository w/ remote and root', function (st) {
    st.plan(1)

    fs.renameSync('../../.git', '../../.git.bak')

    childProcess.exec(
      [
        bin,
        '--no-config',
        '--no-ignore',
        '--use',
        '"../..=repository:\\"wooorm/test\\",root:\\"../\\""',
        'small.md'
      ].join(' '),
      onexec
    )

    function onexec(error, stdout, stderr) {
      fs.renameSync('../../.git.bak', '../../.git')
      st.deepEqual(
        [error, strip(stderr)],
        [
          null,
          [
            'small.md',
            '  5:13-5:27  warning  Link to unknown heading: `world`  missing-heading  remark-validate-links',
            '',
            '⚠ 1 warning',
            ''
          ].join('\n')
        ],
        'should work'
      )
    }
  })

  t.test('should work with `repository:false`', function (st) {
    st.plan(1)

    fs.renameSync('../../.git', '../../.git.bak')

    childProcess.exec(
      [
        bin,
        '--no-config',
        '--no-ignore',
        '--use',
        '"../..=repository:false"',
        '--use',
        '../sort',
        'github.md',
        'examples/github.md'
      ].join(' '),
      onexec
    )

    function onexec(error, stdout, stderr) {
      fs.renameSync('../../.git.bak', '../../.git')
      st.deepEqual(
        [error, strip(stderr)],
        [
          null,
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
        ],
        'should work'
      )
    }
  })

  t.test('should work when finding non-hosted Git remotes', function (st) {
    st.plan(1)

    childProcess.exec(
      [
        bin,
        '--no-config',
        '--no-ignore',
        '--use',
        '"../..=repository:\\"ssh://git@domain.com/user/project.git\\""',
        '--use',
        '../sort',
        'small.md'
      ].join(' '),
      onexec
    )

    function onexec(error, stdout, stderr) {
      st.deepEqual(
        [error, strip(stderr)],
        [
          null,
          [
            'small.md',
            '  5:13-5:27  warning  Link to unknown heading: `world`  missing-heading  remark-validate-links',
            '',
            '⚠ 1 warning',
            ''
          ].join('\n')
        ],
        'should work'
      )
    }
  })

  t.test('should support a GitLab shortcode', function (st) {
    st.plan(1)

    childProcess.exec(
      [
        bin,
        '--no-config',
        '--no-ignore',
        '--use',
        '"../..=repository:\\"gitlab:wooorm/test\\""',
        '--use',
        '../sort',
        'gitlab.md'
      ].join(' '),
      onexec
    )

    function onexec(error, stdout, stderr) {
      st.deepEqual(
        [error, strip(stderr)],
        [
          null,
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
        ],
        'should work'
      )
    }
  })

  t.test('should support a Bitbucket shortcode', function (st) {
    st.plan(1)

    childProcess.exec(
      [
        bin,
        '--no-config',
        '--no-ignore',
        '--use',
        '"../..=repository:\\"bitbucket:wooorm/test\\""',
        '--use',
        '../sort',
        'bitbucket.md'
      ].join(' '),
      onexec
    )

    function onexec(error, stdout, stderr) {
      st.deepEqual(
        [error, strip(stderr)],
        [
          null,
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
        ],
        'should work'
      )
    }
  })

  t.test('should suggest similar links', function (st) {
    st.plan(1)

    childProcess.exec(
      [
        bin,
        '--no-config',
        '--no-ignore',
        '--use',
        '../..',
        '--use',
        '../sort',
        'suggestions.md'
      ].join(' '),
      onexec
    )

    function onexec(error, stdout, stderr) {
      st.deepEqual(
        [error, strip(stderr)],
        [
          null,
          [
            'suggestions.md',
            '  3:22-3:37  warning  Link to unknown heading: `helloo`. Did you mean `hello`                  missing-heading          remark-validate-links',
            '  7:17-7:39  warning  Link to unknown heading in `github.md`: `fiiiles`. Did you mean `files`  missing-heading-in-file  remark-validate-links',
            '',
            '⚠ 2 warnings',
            ''
          ].join('\n')
        ],
        'should work'
      )
    }
  })

  t.test('should recognise links to particular lines', function (st) {
    st.plan(1)

    childProcess.exec(
      [
        bin,
        '--no-config',
        '--no-ignore',
        '--use',
        '"../..=repository:\\"wooorm/test\\""',
        '--use',
        '../sort',
        'line-links.md'
      ].join(' '),
      onexec
    )

    function onexec(error, stdout, stderr) {
      st.deepEqual(
        [error, strip(stderr)],
        [
          null,
          [
            'line-links.md',
            '  5:9-5:61  warning  Link to unknown file: `examples/missing.js`  missing-file  remark-validate-links',
            '  9:1-9:69  warning  Link to unknown file: `examples/missing.js`  missing-file  remark-validate-links',
            '',
            '⚠ 2 warnings',
            ''
          ].join('\n')
        ],
        'should work'
      )
    }
  })

  t.test('should recognise links with encoded URLs', function (st) {
    st.plan(1)

    childProcess.exec(
      [
        bin,
        '--no-config',
        '--no-ignore',
        '--use',
        '"../..=repository:\\"wooorm/test\\""',
        '--use',
        '../sort',
        'weird-characters.md'
      ].join(' '),
      onexec
    )

    function onexec(error, stdout, stderr) {
      st.deepEqual(
        [error, strip(stderr)],
        [
          null,
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
        ],
        'should work'
      )
    }
  })

  t.test('should support folders', function (st) {
    st.plan(1)

    childProcess.exec(
      [
        bin,
        '--no-config',
        '--no-ignore',
        '--use',
        '"../..=repository:\\"wooorm/test\\""',
        '--use',
        '../sort',
        'folder.md'
      ].join(' '),
      onexec
    )

    function onexec(error, stdout, stderr) {
      st.deepEqual(
        [error, strip(stderr)],
        [
          null,
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
        ],
        'should work'
      )
    }
  })

  t.test('should warn on files as folders', function (st) {
    st.plan(1)

    childProcess.exec(
      [
        bin,
        '--no-config',
        '--no-ignore',
        '--use',
        '../..',
        '--use',
        '../sort',
        'file-as-folder.md'
      ].join(' '),
      onexec
    )

    function onexec(error, stdout, stderr) {
      st.deepEqual(
        [error, strip(stderr)],
        [
          null,
          [
            'file-as-folder.md',
            '  1:1-1:28  warning  Link to unknown file: `file-as-folder.md/other`. Did you mean `file-as-folder.md`  missing-file  remark-validate-links',
            '',
            '⚠ 1 warning',
            ''
          ].join('\n')
        ],
        'should work'
      )
    }
  })

  t.test('should check images', function (st) {
    st.plan(1)

    childProcess.exec(
      [
        bin,
        '--no-config',
        '--no-ignore',
        '--use',
        '"../..=repository:\\"wooorm/test\\""',
        '--use',
        '../sort',
        'images.md'
      ].join(' '),
      onexec
    )

    function onexec(error, stdout, stderr) {
      st.deepEqual(
        [error, strip(stderr)],
        [
          null,
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
        ],
        'should work'
      )
    }
  })

  t.test('should support query parameters', function (st) {
    st.plan(1)

    childProcess.exec(
      [
        bin,
        '--no-config',
        '--no-ignore',
        '--use',
        '"../..=repository:\\"wooorm/test\\""',
        '--use',
        '../sort',
        'query-params.md'
      ].join(' '),
      onexec
    )

    function onexec(error, stdout, stderr) {
      st.deepEqual(
        [error, strip(stderr)],
        [
          null,
          [
            'query-params.md',
            '  11:33-11:55  warning  Link to unknown heading: `query-params?`. Did you mean `query-params`  missing-heading  remark-validate-links',
            '',
            '⚠ 1 warning',
            ''
          ].join('\n')
        ],
        'should work'
      )
    }
  })

  t.test('should support case insensitive headings', function (st) {
    st.plan(1)

    childProcess.exec(
      [
        bin,
        '--no-config',
        '--no-ignore',
        '--use',
        '../..',
        '--use',
        '../sort',
        'case-insensitive-headings.md'
      ].join(' '),
      onexec
    )

    function onexec(error, stdout, stderr) {
      st.deepEqual(
        [error, strip(stderr)],
        [
          null,
          [
            'case-insensitive-headings.md',
            '  5:13-5:27  warning  Link to unknown heading: `world`                          missing-heading          remark-validate-links',
            '  9:16-9:48  warning  Link to unknown heading in `examples/github.md`: `world`  missing-heading-in-file  remark-validate-links',
            '',
            '⚠ 2 warnings',
            ''
          ].join('\n')
        ],
        'should work'
      )
    }
  })

  t.test('should ignore external links', function (st) {
    st.plan(1)

    childProcess.exec(
      [
        bin,
        '--no-config',
        '--no-ignore',
        '--use',
        '"../..=repository:\\"wooorm/test\\""',
        '--use',
        '../sort',
        'external.md'
      ].join(' '),
      onexec
    )

    function onexec(error, stdout, stderr) {
      st.deepEqual(
        [error, strip(stderr)],
        [null, 'external.md: no issues found\n'],
        'should work'
      )
    }
  })

  t.test('should ignore external links (without repo)', function (st) {
    st.plan(1)

    childProcess.exec(
      [
        bin,
        '--no-config',
        '--no-ignore',
        '--use',
        '../..=repository:false',
        '--use',
        '../sort',
        'external.md'
      ].join(' '),
      onexec
    )

    function onexec(error, stdout, stderr) {
      st.deepEqual(
        [error, strip(stderr)],
        [null, 'external.md: no issues found\n'],
        'should work'
      )
    }
  })

  t.test('should support self-hosted Git solutions', function (st) {
    st.plan(1)

    childProcess.exec('git init', oninit)

    function oninit(error) {
      if (error) {
        t.ifErr(error)
      } else {
        childProcess.exec(
          'git remote add origin git@gitlab.acme.company:acme/project.git',
          onremote
        )
      }
    }

    function onremote(error) {
      if (error) {
        clean()
        t.ifErr(error)
      } else {
        childProcess.exec(
          [
            bin,
            '--no-config',
            '--no-ignore',
            '--use',
            '"../..=urlConfig:{hostname:\\"gitlab.acme.com\\",prefix:\\"/acme/project/blob/\\",headingPrefix:\\"#\\",lines:true}"',
            'self-hosted.md'
          ].join(' '),
          onexec
        )
      }
    }

    function onexec(error, stdout, stderr) {
      clean()
      st.deepEqual(
        [error, strip(stderr)],
        [
          null,
          [
            'self-hosted.md',
            '  5:1-5:80  warning  Link to unknown heading: `world`  missing-heading  remark-validate-links',
            '',
            '⚠ 1 warning',
            ''
          ].join('\n')
        ],
        'should work'
      )
    }

    function clean() {
      rimraf.sync('./.git')
    }
  })

  t.end()
})
