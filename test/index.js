'use strict'

var fs = require('fs')
var path = require('path')
var test = require('tape')
var execa = require('execa')
var vfile = require('to-vfile')
var remark = require('remark')
var strip = require('strip-ansi')
var rimraf = require('rimraf')
var sort = require('./sort')
var links = require('..')

process.chdir(path.resolve(process.cwd(), 'test', 'fixtures'))

test.onFinish(function() {
  process.chdir(path.resolve(process.cwd(), '..', '..'))
})

var bin = path.join('..', '..', 'node_modules', '.bin', 'remark')

test('remark-validate-links', function(t) {
  t.test('should work on the API', function(st) {
    st.plan(1)

    remark()
      .use(links)
      .use(sort)
      .process(vfile.readSync('github.md'), function(err, file) {
        st.deepEqual(
          [err].concat(file.messages.map(String)),
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

  t.test('should ignore invalid repositories', function(st) {
    st.plan(1)

    execa(bin, [
      '--no-config',
      '--no-ignore',
      '--use',
      '../..=repository:"invalid:shortcode"',
      '--use',
      '../sort',
      'small.md'
    ]).then(
      function(result) {
        st.equal(
          strip(result.stderr),
          [
            'small.md',
            '  5:13-5:27  warning  Link to unknown heading: `world`  missing-heading  remark-validate-links',
            '',
            '⚠ 1 warning'
          ].join('\n'),
          'should work'
        )
      },
      function(err) {
        st.error(err)
      }
    )
  })

  t.test('should throw on Gist repositories', function(st) {
    st.plan(1)

    execa(bin, [
      '--no-config',
      '--no-ignore',
      '--use',
      '../..=repository:"gist:wooorm/8504606"',
      '--use',
      '../sort',
      'small.md'
    ]).then(
      function(result) {
        st.equal(
          strip(result.stderr),
          [
            'small.md',
            '  5:13-5:27  warning  Link to unknown heading: `world`  missing-heading  remark-validate-links',
            '',
            '⚠ 1 warning'
          ].join('\n'),
          'should work'
        )
      },
      function(err) {
        st.error(err, 'should not fail')
      }
    )
  })

  t.test('should ignore unfound files (#1)', function(st) {
    st.plan(1)

    execa(bin, [
      '--no-config',
      '--no-ignore',
      '--use',
      '../..',
      '--use',
      '../sort',
      'FOOOO'
    ]).then(
      function() {
        st.fail('should not be successful')
      },
      function(err) {
        st.equal(
          strip(err.stderr),
          [
            'FOOOO',
            '  1:1  error  No such file or directory',
            '',
            '✖ 1 error',
            ''
          ].join('\n'),
          'should report an error'
        )
      }
    )
  })

  t.test('should ignore unfound files (#2)', function(st) {
    st.plan(1)

    execa(bin, [
      '--no-config',
      '--no-ignore',
      '--use',
      '../..',
      '--use',
      '../sort',
      'definitions.md',
      'FOOOO'
    ]).then(
      function() {
        st.fail('should not be successful')
      },
      function(err) {
        st.equal(
          strip(err.stderr),
          [
            'FOOOO',
            '         1:1  error    No such file or directory',
            '',
            'definitions.md',
            '  10:1-10:18  warning  Link to unknown heading: `world`  missing-heading  remark-validate-links',
            '',
            '2 messages (✖ 1 error, ⚠ 1 warning)',
            ''
          ].join('\n'),
          'should report an error'
        )
      }
    )
  })

  t.test('should work if there are no links', function(st) {
    st.plan(1)

    execa(bin, [
      '--no-config',
      '--no-ignore',
      '--use',
      '../..',
      '--use',
      '../sort',
      'empty.md'
    ]).then(function(result) {
      st.equal(
        strip(result.stderr),
        'empty.md: no issues found',
        'should report'
      )
    }, st.error)
  })

  t.test('should work with stdin', function(st) {
    st.plan(1)

    var subprocess = execa(bin, [
      '--no-config',
      '--no-ignore',
      '--use',
      '../..',
      '--use',
      '../sort'
    ])

    fs.createReadStream('github.md').pipe(subprocess.stdin)

    subprocess.then(function(result) {
      st.equal(
        strip(result.stderr),
        [
          '<stdin>',
          '  5:37-5:51  warning  Link to unknown heading: `world`  missing-heading  remark-validate-links',
          '',
          '⚠ 1 warning'
        ].join('\n'),
        'should report an error'
      )
    }, st.error)
  })

  t.test('should work when not all files are given', function(st) {
    st.plan(1)

    execa(bin, [
      '--no-config',
      '--no-ignore',
      '--use',
      '../..',
      '--use',
      '../sort',
      'github.md'
    ]).then(function(result) {
      st.equal(
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
          '⚠ 9 warnings'
        ].join('\n'),
        'should report'
      )
    }, st.error)
  })

  t.test('should work when all files are given', function(st) {
    st.plan(1)

    execa(bin, [
      '--no-config',
      '--no-ignore',
      '--use',
      '../..',
      '--use',
      '../sort',
      'github.md',
      'examples/github.md'
    ]).then(function(result) {
      st.equal(
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
          '⚠ 14 warnings'
        ].join('\n'),
        'should report'
      )
    }, st.error)
  })

  t.test('should work with definitions', function(st) {
    st.plan(1)

    execa(bin, [
      '--no-config',
      '--no-ignore',
      '--use',
      '../..',
      '--use',
      '../sort',
      'definitions.md'
    ]).then(function(result) {
      st.equal(
        strip(result.stderr),
        [
          'definitions.md',
          '  10:1-10:18  warning  Link to unknown heading: `world`  missing-heading  remark-validate-links',
          '',
          '⚠ 1 warning'
        ].join('\n'),
        'should report'
      )
    }, st.error)
  })

  t.test('should work on GitHub URLs when given a repo', function(st) {
    st.plan(1)

    execa(bin, [
      '--no-config',
      '--no-ignore',
      '--use',
      '../..=repository:"wooorm/test"',
      '--use',
      '../sort',
      'github.md',
      'examples/github.md'
    ]).then(function(result) {
      st.equal(
        strip(result.stderr),
        [
          'examples/github.md',
          '     5:37-5:51  warning  Link to unknown heading: `world`                          missing-heading          remark-validate-links',
          '   15:34-15:93  warning  Link to unknown file: `../world.md`                       missing-file             remark-validate-links',
          '   17:12-17:72  warning  Link to unknown file: `../world.md`                       missing-file             remark-validate-links',
          '   19:10-19:29  warning  Link to unknown file: `../world.md`                       missing-file             remark-validate-links',
          '   29:10-29:33  warning  Link to unknown heading in `../github.md`: `world`        missing-heading-in-file  remark-validate-links',
          '   31:10-31:73  warning  Link to unknown heading in `../github.md`: `world`        missing-heading-in-file  remark-validate-links',
          '   33:10-33:74  warning  Link to unknown heading in `../github.md`: `world`        missing-heading-in-file  remark-validate-links',
          '   35:10-35:32  warning  Link to unknown file: `../world.md`                       missing-file             remark-validate-links',
          '   35:10-35:32  warning  Link to unknown heading in `../world.md`: `hello`         missing-heading-in-file  remark-validate-links',
          '   37:10-37:72  warning  Link to unknown file: `../world.md`                       missing-file             remark-validate-links',
          '   37:10-37:72  warning  Link to unknown heading in `../world.md`: `hello`         missing-heading-in-file  remark-validate-links',
          '   39:10-39:73  warning  Link to unknown file: `../world.md`                       missing-file             remark-validate-links',
          '   39:10-39:73  warning  Link to unknown heading in `../world.md`: `hello`         missing-heading-in-file  remark-validate-links',
          '',
          'github.md',
          '     5:37-5:51  warning  Link to unknown heading: `world`                          missing-heading          remark-validate-links',
          '  21:34-21:102  warning  Link to unknown file: `examples/world.md`                 missing-file             remark-validate-links',
          '   23:34-23:84  warning  Link to unknown file: `examples/world.md`                 missing-file             remark-validate-links',
          '   25:12-25:81  warning  Link to unknown file: `examples/world.md`                 missing-file             remark-validate-links',
          '   27:10-27:37  warning  Link to unknown file: `examples/world.md`                 missing-file             remark-validate-links',
          '   29:10-29:35  warning  Link to unknown file: `examples/world.md`                 missing-file             remark-validate-links',
          '   41:10-41:41  warning  Link to unknown heading in `examples/github.md`: `world`  missing-heading-in-file  remark-validate-links',
          '   43:10-43:39  warning  Link to unknown heading in `examples/github.md`: `world`  missing-heading-in-file  remark-validate-links',
          '   45:10-45:82  warning  Link to unknown heading in `examples/github.md`: `world`  missing-heading-in-file  remark-validate-links',
          '   47:10-47:83  warning  Link to unknown heading in `examples/github.md`: `world`  missing-heading-in-file  remark-validate-links',
          '   49:10-49:40  warning  Link to unknown file: `examples/world.md`                 missing-file             remark-validate-links',
          '   49:10-49:40  warning  Link to unknown heading in `examples/world.md`: `hello`   missing-heading-in-file  remark-validate-links',
          '   51:10-51:38  warning  Link to unknown file: `examples/world.md`                 missing-file             remark-validate-links',
          '   51:10-51:38  warning  Link to unknown heading in `examples/world.md`: `hello`   missing-heading-in-file  remark-validate-links',
          '   53:10-53:81  warning  Link to unknown file: `examples/world.md`                 missing-file             remark-validate-links',
          '   53:10-53:81  warning  Link to unknown heading in `examples/world.md`: `hello`   missing-heading-in-file  remark-validate-links',
          '   55:10-55:82  warning  Link to unknown file: `examples/world.md`                 missing-file             remark-validate-links',
          '   55:10-55:82  warning  Link to unknown heading in `examples/world.md`: `hello`   missing-heading-in-file  remark-validate-links',
          '',
          '⚠ 31 warnings'
        ].join('\n'),
        'should report'
      )
    }, st.error)
  })

  t.test('should work when with Git directory', function(st) {
    st.plan(1)

    Promise.resolve()
      .then(function() {
        return execa('git', ['init'])
      })
      .then(function() {
        return execa('git', [
          'remote',
          'add',
          'origin',
          'git@github.com:wooorm/test.git'
        ])
      })
      .then(function() {
        return execa(bin, [
          '--no-config',
          '--no-ignore',
          '--use',
          '../..',
          '--use',
          '../sort',
          'github.md',
          'examples/github.md'
        ])
      })
      .then(
        function(result) {
          clean()
          st.equal(
            strip(result.stderr),
            [
              'examples/github.md',
              '     5:37-5:51  warning  Link to unknown heading: `world`                          missing-heading          remark-validate-links',
              '   15:34-15:93  warning  Link to unknown file: `../world.md`                       missing-file             remark-validate-links',
              '   17:12-17:72  warning  Link to unknown file: `../world.md`                       missing-file             remark-validate-links',
              '   19:10-19:29  warning  Link to unknown file: `../world.md`                       missing-file             remark-validate-links',
              '   29:10-29:33  warning  Link to unknown heading in `../github.md`: `world`        missing-heading-in-file  remark-validate-links',
              '   31:10-31:73  warning  Link to unknown heading in `../github.md`: `world`        missing-heading-in-file  remark-validate-links',
              '   33:10-33:74  warning  Link to unknown heading in `../github.md`: `world`        missing-heading-in-file  remark-validate-links',
              '   35:10-35:32  warning  Link to unknown file: `../world.md`                       missing-file             remark-validate-links',
              '   35:10-35:32  warning  Link to unknown heading in `../world.md`: `hello`         missing-heading-in-file  remark-validate-links',
              '   37:10-37:72  warning  Link to unknown file: `../world.md`                       missing-file             remark-validate-links',
              '   37:10-37:72  warning  Link to unknown heading in `../world.md`: `hello`         missing-heading-in-file  remark-validate-links',
              '   39:10-39:73  warning  Link to unknown file: `../world.md`                       missing-file             remark-validate-links',
              '   39:10-39:73  warning  Link to unknown heading in `../world.md`: `hello`         missing-heading-in-file  remark-validate-links',
              '',
              'github.md',
              '     5:37-5:51  warning  Link to unknown heading: `world`                          missing-heading          remark-validate-links',
              '  21:34-21:102  warning  Link to unknown file: `examples/world.md`                 missing-file             remark-validate-links',
              '   23:34-23:84  warning  Link to unknown file: `examples/world.md`                 missing-file             remark-validate-links',
              '   25:12-25:81  warning  Link to unknown file: `examples/world.md`                 missing-file             remark-validate-links',
              '   27:10-27:37  warning  Link to unknown file: `examples/world.md`                 missing-file             remark-validate-links',
              '   29:10-29:35  warning  Link to unknown file: `examples/world.md`                 missing-file             remark-validate-links',
              '   41:10-41:41  warning  Link to unknown heading in `examples/github.md`: `world`  missing-heading-in-file  remark-validate-links',
              '   43:10-43:39  warning  Link to unknown heading in `examples/github.md`: `world`  missing-heading-in-file  remark-validate-links',
              '   45:10-45:82  warning  Link to unknown heading in `examples/github.md`: `world`  missing-heading-in-file  remark-validate-links',
              '   47:10-47:83  warning  Link to unknown heading in `examples/github.md`: `world`  missing-heading-in-file  remark-validate-links',
              '   49:10-49:40  warning  Link to unknown file: `examples/world.md`                 missing-file             remark-validate-links',
              '   49:10-49:40  warning  Link to unknown heading in `examples/world.md`: `hello`   missing-heading-in-file  remark-validate-links',
              '   51:10-51:38  warning  Link to unknown file: `examples/world.md`                 missing-file             remark-validate-links',
              '   51:10-51:38  warning  Link to unknown heading in `examples/world.md`: `hello`   missing-heading-in-file  remark-validate-links',
              '   53:10-53:81  warning  Link to unknown file: `examples/world.md`                 missing-file             remark-validate-links',
              '   53:10-53:81  warning  Link to unknown heading in `examples/world.md`: `hello`   missing-heading-in-file  remark-validate-links',
              '   55:10-55:82  warning  Link to unknown file: `examples/world.md`                 missing-file             remark-validate-links',
              '   55:10-55:82  warning  Link to unknown heading in `examples/world.md`: `hello`   missing-heading-in-file  remark-validate-links',
              '',
              '⚠ 31 warnings'
            ].join('\n'),
            'should report'
          )
        },
        function(err) {
          clean()
          st.error(err)
        }
      )

    function clean() {
      rimraf.sync('./.git')
    }
  })

  t.test('should fail w/o Git repository', function(st) {
    st.plan(1)

    fs.renameSync('../../.git', '../../.git.bak')

    execa(bin, [
      '--no-config',
      '--no-ignore',
      '--use',
      '../..',
      '--use',
      '../sort',
      'github.md'
    ]).then(
      function() {
        clean()
        st.fail('should not work')
      },
      function(err) {
        clean()
        st.ok(/not a git repository/i.test(err), 'should fail')
      }
    )

    function clean() {
      fs.renameSync('../../.git.bak', '../../.git')
    }
  })

  t.test('should fail w/o Git repository w/o remote', function(st) {
    st.plan(1)

    Promise.resolve()
      .then(function() {
        return execa('git', ['init'])
      })
      .then(function() {
        return execa(bin, [
          '--no-config',
          '--no-ignore',
          '--use',
          '../..',
          'github.md'
        ])
      })
      .then(
        function() {
          clean()
          st.fail('should not work')
        },
        function(err) {
          clean()
          st.ok(/Could not find remote origin/.test(err), 'should fail')
        }
      )

    function clean() {
      rimraf.sync('./.git')
    }
  })

  t.test('should work w/o Git repository w/ repo', function(st) {
    st.plan(1)

    fs.renameSync('../../.git', '../../.git.bak')

    execa(bin, [
      '--no-config',
      '--no-ignore',
      '--use',
      '../..=repository:"wooorm/test"',
      '--use',
      '../sort',
      'small.md'
    ]).then(
      function(result) {
        clean()
        st.equal(
          strip(result.stderr),
          [
            'small.md',
            '  5:13-5:27  warning  Link to unknown heading: `world`  missing-heading  remark-validate-links',
            '',
            '⚠ 1 warning'
          ].join('\n'),
          'should work'
        )
      },
      function(err) {
        clean()
        st.error(err, 'shoult not fail')
      }
    )

    function clean() {
      fs.renameSync('../../.git.bak', '../../.git')
    }
  })

  t.test('should work w/o Git repository w/ remote', function(st) {
    st.plan(1)

    fs.renameSync('../../.git', '../../.git.bak')

    execa(bin, [
      '--no-config',
      '--no-ignore',
      '--use',
      '../..=repository:{remote:"wooorm/test"}',
      'small.md'
    ]).then(
      function(result) {
        clean()
        st.equal(
          strip(result.stderr),
          [
            'small.md',
            '  5:13-5:27  warning  Link to unknown heading: `world`  missing-heading  remark-validate-links',
            '',
            '⚠ 1 warning'
          ].join('\n'),
          'should work'
        )
      },
      function(err) {
        clean()
        st.error(err, 'shoult not fail')
      }
    )

    function clean() {
      fs.renameSync('../../.git.bak', '../../.git')
    }
  })

  t.test('should work w/o Git repository w/ remote and root', function(st) {
    st.plan(1)

    fs.renameSync('../../.git', '../../.git.bak')

    execa(bin, [
      '--no-config',
      '--no-ignore',
      '--use',
      '../..=repository:"wooorm/test",root:"../"',
      'small.md'
    ]).then(
      function(result) {
        clean()
        st.equal(
          strip(result.stderr),
          [
            'small.md',
            '  5:13-5:27  warning  Link to unknown heading: `world`  missing-heading  remark-validate-links',
            '',
            '⚠ 1 warning'
          ].join('\n'),
          'should work'
        )
      },
      function(err) {
        clean()
        st.error(err, 'shoult not fail')
      }
    )

    function clean() {
      fs.renameSync('../../.git.bak', '../../.git')
    }
  })

  t.test('should work with `repository:false`', function(st) {
    st.plan(1)

    fs.renameSync('../../.git', '../../.git.bak')

    execa(bin, [
      '--no-config',
      '--no-ignore',
      '--use',
      '../..=repository:false',
      '--use',
      '../sort',
      'github.md',
      'examples/github.md'
    ]).then(
      function(result) {
        clean()
        st.equal(
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
            '⚠ 14 warnings'
          ].join('\n'),
          'should report'
        )
      },
      function(err) {
        clean()
        st.error(err)
      }
    )

    function clean() {
      fs.renameSync('../../.git.bak', '../../.git')
    }
  })

  t.test('should work when finding non-hosted Git remotes', function(st) {
    st.plan(1)

    execa(bin, [
      '--no-config',
      '--no-ignore',
      '--use',
      '../..=repository:"ssh://git@domain.com/user/project.git"',
      '--use',
      '../sort',
      'small.md'
    ]).then(function(result) {
      st.equal(
        strip(result.stderr),
        [
          'small.md',
          '  5:13-5:27  warning  Link to unknown heading: `world`  missing-heading  remark-validate-links',
          '',
          '⚠ 1 warning'
        ].join('\n'),
        'should report'
      )
    }, st.error)
  })

  t.test('should support a GitLab shortcode', function(st) {
    st.plan(1)

    execa(bin, [
      '--no-config',
      '--no-ignore',
      '--use',
      '../..=repository:"gitlab:wooorm/test"',
      '--use',
      '../sort',
      'gitlab.md'
    ]).then(function(result) {
      st.equal(
        strip(result.stderr),
        [
          'gitlab.md',
          '     5:37-5:51  warning  Link to unknown heading: `world`                                              missing-heading          remark-validate-links',
          '  19:34-19:102  warning  Link to unknown file: `examples/world.md`. Did you mean `examples/gitlab.md`  missing-file             remark-validate-links',
          '   21:12-21:81  warning  Link to unknown file: `examples/world.md`. Did you mean `examples/gitlab.md`  missing-file             remark-validate-links',
          '   23:10-23:37  warning  Link to unknown file: `examples/world.md`. Did you mean `examples/gitlab.md`  missing-file             remark-validate-links',
          '   25:10-25:35  warning  Link to unknown file: `examples/world.md`. Did you mean `examples/gitlab.md`  missing-file             remark-validate-links',
          '   37:10-37:41  warning  Link to unknown heading in `examples/gitlab.md`: `world`                      missing-heading-in-file  remark-validate-links',
          '   39:10-39:39  warning  Link to unknown heading in `examples/gitlab.md`: `world`                      missing-heading-in-file  remark-validate-links',
          '   41:10-41:82  warning  Link to unknown heading in `examples/gitlab.md`: `world`                      missing-heading-in-file  remark-validate-links',
          '   43:10-43:83  warning  Link to unknown heading in `examples/gitlab.md`: `world`                      missing-heading-in-file  remark-validate-links',
          '   45:10-45:40  warning  Link to unknown file: `examples/world.md`. Did you mean `examples/gitlab.md`  missing-file             remark-validate-links',
          '   45:10-45:40  warning  Link to unknown heading in `examples/world.md`: `hello`                       missing-heading-in-file  remark-validate-links',
          '   47:10-47:38  warning  Link to unknown file: `examples/world.md`. Did you mean `examples/gitlab.md`  missing-file             remark-validate-links',
          '   47:10-47:38  warning  Link to unknown heading in `examples/world.md`: `hello`                       missing-heading-in-file  remark-validate-links',
          '   49:10-49:81  warning  Link to unknown file: `examples/world.md`. Did you mean `examples/gitlab.md`  missing-file             remark-validate-links',
          '   49:10-49:81  warning  Link to unknown heading in `examples/world.md`: `hello`                       missing-heading-in-file  remark-validate-links',
          '   51:10-51:82  warning  Link to unknown file: `examples/world.md`. Did you mean `examples/gitlab.md`  missing-file             remark-validate-links',
          '   51:10-51:82  warning  Link to unknown heading in `examples/world.md`: `hello`                       missing-heading-in-file  remark-validate-links',
          '',
          '⚠ 17 warnings'
        ].join('\n'),
        'should report'
      )
    }, st.error)
  })

  t.test('should support a Bitbucket shortcode', function(st) {
    st.plan(1)

    execa(bin, [
      '--no-config',
      '--no-ignore',
      '--use',
      '../..=repository:"bitbucket:wooorm/test"',
      '--use',
      '../sort',
      'bitbucket.md'
    ]).then(function(result) {
      st.equal(
        strip(result.stderr),
        [
          'bitbucket.md',
          '     5:37-5:67  warning  Link to unknown heading: `world`                             missing-heading          remark-validate-links',
          '  21:34-21:104  warning  Link to unknown file: `examples/world.md`                    missing-file             remark-validate-links',
          '   23:12-23:83  warning  Link to unknown file: `examples/world.md`                    missing-file             remark-validate-links',
          '   25:10-25:37  warning  Link to unknown file: `examples/world.md`                    missing-file             remark-validate-links',
          '   27:10-27:35  warning  Link to unknown file: `examples/world.md`                    missing-file             remark-validate-links',
          '   39:10-39:60  warning  Link to unknown heading in `examples/bitbucket.md`: `world`  missing-heading-in-file  remark-validate-links',
          '   41:10-41:58  warning  Link to unknown heading in `examples/bitbucket.md`: `world`  missing-heading-in-file  remark-validate-links',
          '  43:10-43:103  warning  Link to unknown heading in `examples/bitbucket.md`: `world`  missing-heading-in-file  remark-validate-links',
          '  45:10-45:104  warning  Link to unknown heading in `examples/bitbucket.md`: `world`  missing-heading-in-file  remark-validate-links',
          '   47:10-47:56  warning  Link to unknown file: `examples/world.md`                    missing-file             remark-validate-links',
          '   47:10-47:56  warning  Link to unknown heading in `examples/world.md`: `hello`      missing-heading-in-file  remark-validate-links',
          '   49:10-49:54  warning  Link to unknown file: `examples/world.md`                    missing-file             remark-validate-links',
          '   49:10-49:54  warning  Link to unknown heading in `examples/world.md`: `hello`      missing-heading-in-file  remark-validate-links',
          '   51:10-51:99  warning  Link to unknown file: `examples/world.md`                    missing-file             remark-validate-links',
          '   51:10-51:99  warning  Link to unknown heading in `examples/world.md`: `hello`      missing-heading-in-file  remark-validate-links',
          '  53:10-53:100  warning  Link to unknown file: `examples/world.md`                    missing-file             remark-validate-links',
          '  53:10-53:100  warning  Link to unknown heading in `examples/world.md`: `hello`      missing-heading-in-file  remark-validate-links',
          '',
          '⚠ 17 warnings'
        ].join('\n'),
        'should report'
      )
    }, st.error)
  })

  t.test('should suggest similar links', function(st) {
    st.plan(1)

    execa(bin, [
      '--no-config',
      '--no-ignore',
      '--use',
      '../..',
      '--use',
      '../sort',
      'suggestions.md'
    ]).then(function(result) {
      st.equal(
        strip(result.stderr),
        [
          'suggestions.md',
          '  3:22-3:37  warning  Link to unknown heading: `helloo`. Did you mean `hello`                  missing-heading          remark-validate-links',
          '  7:17-7:39  warning  Link to unknown heading in `github.md`: `fiiiles`. Did you mean `files`  missing-heading-in-file  remark-validate-links',
          '',
          '⚠ 2 warnings'
        ].join('\n'),
        'should report'
      )
    }, st.error)
  })

  t.test('should recognise links to particular lines', function(st) {
    st.plan(1)

    execa(bin, [
      '--no-config',
      '--no-ignore',
      '--use',
      '../..=repository:"wooorm/test"',
      '--use',
      '../sort',
      'line-links.md'
    ]).then(function(result) {
      st.equal(
        strip(result.stderr),
        [
          'line-links.md',
          '  5:9-5:61  warning  Link to unknown file: `examples/missing.js`  missing-file  remark-validate-links',
          '  9:1-9:71  warning  Link to unknown file: `examples/missing.js`  missing-file  remark-validate-links',
          '',
          '⚠ 2 warnings'
        ].join('\n'),
        'should report'
      )
    }, st.error)
  })

  t.test('should check images', function(st) {
    st.plan(1)

    execa(bin, [
      '--no-config',
      '--no-ignore',
      '--use',
      '../..=repository:"wooorm/test"',
      '--use',
      '../sort',
      'images.md'
    ]).then(function(result) {
      st.equal(
        strip(result.stderr),
        [
          'images.md',
          '  19:10-19:50  warning  Link to unknown file: `examples/missing.jpg`. Did you mean `examples/image.jpg`  missing-file  remark-validate-links',
          '  21:12-21:42  warning  Link to unknown file: `examples/missing.jpg`. Did you mean `examples/image.jpg`  missing-file  remark-validate-links',
          '  23:10-23:91  warning  Link to unknown file: `examples/missing.jpg`. Did you mean `examples/image.jpg`  missing-file  remark-validate-links',
          '   35:1-35:38  warning  Link to unknown file: `examples/missing.jpg`. Did you mean `examples/image.jpg`  missing-file  remark-validate-links',
          '   37:1-37:79  warning  Link to unknown file: `examples/missing.jpg`. Did you mean `examples/image.jpg`  missing-file  remark-validate-links',
          '',
          '⚠ 5 warnings'
        ].join('\n'),
        'should report'
      )
    }, st.error)
  })

  t.test('should support query parameters', function(st) {
    st.plan(1)

    execa(bin, [
      '--no-config',
      '--no-ignore',
      '--use',
      '../..=repository:"wooorm/test"',
      '--use',
      '../sort',
      'query-params.md'
    ]).then(
      function(result) {
        st.equal(
          strip(result.stderr),
          [
            'query-params.md',
            '  9:33-9:55  warning  Link to unknown heading: `query-params?`. Did you mean `query-params`  missing-heading  remark-validate-links',
            '',
            '⚠ 1 warning'
          ].join('\n'),
          'should report'
        )
      },
      function(err) {
        st.error(err, 'should not fail')
      }
    )
  })

  t.test('should support query parameters', function(st) {
    st.plan(1)

    execa(bin, [
      '--no-config',
      '--no-ignore',
      '--use',
      '../..',
      '--use',
      '../sort',
      'case-insensitive-headings.md'
    ]).then(
      function(result) {
        st.equal(
          strip(result.stderr),
          [
            'case-insensitive-headings.md',
            '  5:13-5:27  warning  Link to unknown heading: `world`                          missing-heading          remark-validate-links',
            '  9:16-9:48  warning  Link to unknown heading in `examples/github.md`: `world`  missing-heading-in-file  remark-validate-links',
            '',
            '⚠ 2 warnings'
          ].join('\n'),
          'should report'
        )
      },
      function(err) {
        st.error(err, 'should not fail')
      }
    )
  })

  t.test('should support self-hosted Git solutions', function(st) {
    st.plan(1)

    Promise.resolve()
      .then(function() {
        return execa('git', ['init'])
      })
      .then(function() {
        return execa('git', [
          'remote',
          'add',
          'origin',
          'git@gitlab.acme.company:acme/project.git'
        ])
      })
      .then(function() {
        return execa(bin, [
          '--no-config',
          '--no-ignore',
          '--use',
          '../..=urlConfig:{hostname:"gitlab.acme.com",prefix:"/acme/project/blob/",headingPrefix:"#",lines:true}',
          'self-hosted.md'
        ])
      })
      .then(
        function(result) {
          clean()
          st.equal(
            strip(result.stderr),
            [
              'self-hosted.md',
              '  5:1-5:82  warning  Link to unknown heading: `world`  missing-heading  remark-validate-links',
              '',
              '⚠ 1 warning'
            ].join('\n'),
            'should report'
          )
        },
        function(err) {
          clean()
          st.error(err)
        }
      )

    function clean() {
      rimraf.sync('./.git')
    }
  })

  t.end()
})
