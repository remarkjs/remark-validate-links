'use strict'

var fs = require('fs')
var path = require('path')
var test = require('tape')
var execa = require('execa')
var vfile = require('to-vfile')
var remark = require('remark')
var strip = require('strip-ansi')
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
          [null, 'github.md:5:37-5:51: Link to unknown heading: `world`'],
          'should report messages'
        )
      })
  })

  t.test('should throw on unparsable git repositories', function(st) {
    st.plan(1)

    execa(bin, [
      '--no-config',
      '--no-ignore',
      '--use',
      '../..=repository:"invalid:shortcode"',
      '--use',
      '../sort',
      'definitions.md'
    ]).then(
      function() {
        st.fail('should not be successful')
      },
      function(err) {
        st.equal(
          strip(err.stderr)
            .split('\n')
            .slice(0, 2)
            .join('\n'),
          [
            'definitions.md',
            '  1:1  error  Error: remark-validate-links cannot parse `repository` (`invalid:shortcode`)'
          ].join('\n'),
          'should report an error'
        )
      }
    )
  })

  t.test('should throw on gist repositories', function(st) {
    st.plan(1)

    execa(bin, [
      '--no-config',
      '--no-ignore',
      '--use',
      '../..=repository:"gist:wooorm/8504606"',
      '--use',
      '../sort',
      'definitions.md'
    ]).then(
      function() {
        st.fail('should not be successful')
      },
      function(err) {
        st.equal(
          strip(err.stderr)
            .split('\n')
            .slice(0, 2)
            .join('\n'),
          [
            'definitions.md',
            '  1:1  error  Error: remark-validate-links does not support gist repositories'
          ].join('\n'),
          'should report an error'
        )
      }
    )
  })

  t.test('should ignore unfound files', function(st) {
    st.plan(1)

    execa(bin, [
      '--no-config',
      '--no-ignore',
      '--use',
      '../..',
      'definitions.md',
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
            '        1:1  error    No such file or directory',
            '',
            'definitions.md',
            '  5:12-5:21  warning  Link to unknown heading: `world`  missing-heading  remark-validate-links',
            '',
            '2 messages (✖ 1 error, ⚠ 1 warning)',
            ''
          ].join('\n'),
          'should report an error'
        )
      }
    )
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
          '  23:10-23:37  warning  Link to unknown file: `examples/world.md`                 missing-file             remark-validate-links',
          '  25:10-25:35  warning  Link to unknown file: `examples/world.md`                 missing-file             remark-validate-links',
          '  37:10-37:41  warning  Link to unknown heading in `examples/github.md`: `world`  missing-heading-in-file  remark-validate-links',
          '  39:10-39:39  warning  Link to unknown heading in `examples/github.md`: `world`  missing-heading-in-file  remark-validate-links',
          '  45:10-45:40  warning  Link to unknown file: `examples/world.md`                 missing-file             remark-validate-links',
          '  45:10-45:40  warning  Link to unknown heading in `examples/world.md`: `hello`   missing-heading-in-file  remark-validate-links',
          '  47:10-47:38  warning  Link to unknown file: `examples/world.md`                 missing-file             remark-validate-links',
          '  47:10-47:38  warning  Link to unknown heading in `examples/world.md`: `hello`   missing-heading-in-file  remark-validate-links',
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
          '  19:10-19:29  warning  Link to unknown file: `world.md`                          missing-file             remark-validate-links',
          '  29:10-29:33  warning  Link to unknown heading in `github.md`: `world`           missing-heading-in-file  remark-validate-links',
          '  35:10-35:32  warning  Link to unknown file: `world.md`                          missing-file             remark-validate-links',
          '  35:10-35:32  warning  Link to unknown heading in `world.md`: `hello`            missing-heading-in-file  remark-validate-links',
          '',
          'github.md',
          '    5:37-5:51  warning  Link to unknown heading: `world`                          missing-heading          remark-validate-links',
          '  23:10-23:37  warning  Link to unknown file: `examples/world.md`                 missing-file             remark-validate-links',
          '  25:10-25:35  warning  Link to unknown file: `examples/world.md`                 missing-file             remark-validate-links',
          '  37:10-37:41  warning  Link to unknown heading in `examples/github.md`: `world`  missing-heading-in-file  remark-validate-links',
          '  39:10-39:39  warning  Link to unknown heading in `examples/github.md`: `world`  missing-heading-in-file  remark-validate-links',
          '  45:10-45:40  warning  Link to unknown file: `examples/world.md`                 missing-file             remark-validate-links',
          '  45:10-45:40  warning  Link to unknown heading in `examples/world.md`: `hello`   missing-heading-in-file  remark-validate-links',
          '  47:10-47:38  warning  Link to unknown file: `examples/world.md`                 missing-file             remark-validate-links',
          '  47:10-47:38  warning  Link to unknown heading in `examples/world.md`: `hello`   missing-heading-in-file  remark-validate-links',
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
          '  5:12-5:21  warning  Link to unknown heading: `world`  missing-heading  remark-validate-links',
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
          '   15:34-15:93  warning  Link to unknown file: `world.md`                          missing-file             remark-validate-links',
          '   17:12-17:72  warning  Link to unknown file: `world.md`                          missing-file             remark-validate-links',
          '   19:10-19:29  warning  Link to unknown file: `world.md`                          missing-file             remark-validate-links',
          '   29:10-29:33  warning  Link to unknown heading in `github.md`: `world`           missing-heading-in-file  remark-validate-links',
          '   31:10-31:73  warning  Link to unknown heading in `github.md`: `world`           missing-heading-in-file  remark-validate-links',
          '   33:10-33:74  warning  Link to unknown heading in `github.md`: `world`           missing-heading-in-file  remark-validate-links',
          '   35:10-35:32  warning  Link to unknown file: `world.md`                          missing-file             remark-validate-links',
          '   35:10-35:32  warning  Link to unknown heading in `world.md`: `hello`            missing-heading-in-file  remark-validate-links',
          '   37:10-37:72  warning  Link to unknown file: `world.md`                          missing-file             remark-validate-links',
          '   37:10-37:72  warning  Link to unknown heading in `world.md`: `hello`            missing-heading-in-file  remark-validate-links',
          '   39:10-39:73  warning  Link to unknown file: `world.md`                          missing-file             remark-validate-links',
          '   39:10-39:73  warning  Link to unknown heading in `world.md`: `hello`            missing-heading-in-file  remark-validate-links',
          '',
          'github.md',
          '     5:37-5:51  warning  Link to unknown heading: `world`                          missing-heading          remark-validate-links',
          '  19:34-19:102  warning  Link to unknown file: `examples/world.md`                 missing-file             remark-validate-links',
          '   21:12-21:81  warning  Link to unknown file: `examples/world.md`                 missing-file             remark-validate-links',
          '   23:10-23:37  warning  Link to unknown file: `examples/world.md`                 missing-file             remark-validate-links',
          '   25:10-25:35  warning  Link to unknown file: `examples/world.md`                 missing-file             remark-validate-links',
          '   37:10-37:41  warning  Link to unknown heading in `examples/github.md`: `world`  missing-heading-in-file  remark-validate-links',
          '   39:10-39:39  warning  Link to unknown heading in `examples/github.md`: `world`  missing-heading-in-file  remark-validate-links',
          '   41:10-41:82  warning  Link to unknown heading in `examples/github.md`: `world`  missing-heading-in-file  remark-validate-links',
          '   43:10-43:83  warning  Link to unknown heading in `examples/github.md`: `world`  missing-heading-in-file  remark-validate-links',
          '   45:10-45:40  warning  Link to unknown file: `examples/world.md`                 missing-file             remark-validate-links',
          '   45:10-45:40  warning  Link to unknown heading in `examples/world.md`: `hello`   missing-heading-in-file  remark-validate-links',
          '   47:10-47:38  warning  Link to unknown file: `examples/world.md`                 missing-file             remark-validate-links',
          '   47:10-47:38  warning  Link to unknown heading in `examples/world.md`: `hello`   missing-heading-in-file  remark-validate-links',
          '   49:10-49:81  warning  Link to unknown file: `examples/world.md`                 missing-file             remark-validate-links',
          '   49:10-49:81  warning  Link to unknown heading in `examples/world.md`: `hello`   missing-heading-in-file  remark-validate-links',
          '   51:10-51:82  warning  Link to unknown file: `examples/world.md`                 missing-file             remark-validate-links',
          '   51:10-51:82  warning  Link to unknown heading in `examples/world.md`: `hello`   missing-heading-in-file  remark-validate-links',
          '',
          '⚠ 30 warnings'
        ].join('\n'),
        'should report'
      )
    }, st.error)
  })

  t.test('should work on GitHub URLs when with package.json', function(st) {
    st.plan(1)

    // `cwd` is moved to `test/fixtures`.
    fs.writeFileSync(
      './package.json',
      JSON.stringify({repository: 'wooorm/test'}, 0, 2)
    )

    function clean() {
      fs.unlinkSync('./package.json')
    }

    execa(bin, [
      '--no-config',
      '--no-ignore',
      '--use',
      '../..',
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
            '     5:37-5:51  warning  Link to unknown heading: `world`                          missing-heading          remark-validate-links',
            '   15:34-15:93  warning  Link to unknown file: `world.md`                          missing-file             remark-validate-links',
            '   17:12-17:72  warning  Link to unknown file: `world.md`                          missing-file             remark-validate-links',
            '   19:10-19:29  warning  Link to unknown file: `world.md`                          missing-file             remark-validate-links',
            '   29:10-29:33  warning  Link to unknown heading in `github.md`: `world`           missing-heading-in-file  remark-validate-links',
            '   31:10-31:73  warning  Link to unknown heading in `github.md`: `world`           missing-heading-in-file  remark-validate-links',
            '   33:10-33:74  warning  Link to unknown heading in `github.md`: `world`           missing-heading-in-file  remark-validate-links',
            '   35:10-35:32  warning  Link to unknown file: `world.md`                          missing-file             remark-validate-links',
            '   35:10-35:32  warning  Link to unknown heading in `world.md`: `hello`            missing-heading-in-file  remark-validate-links',
            '   37:10-37:72  warning  Link to unknown file: `world.md`                          missing-file             remark-validate-links',
            '   37:10-37:72  warning  Link to unknown heading in `world.md`: `hello`            missing-heading-in-file  remark-validate-links',
            '   39:10-39:73  warning  Link to unknown file: `world.md`                          missing-file             remark-validate-links',
            '   39:10-39:73  warning  Link to unknown heading in `world.md`: `hello`            missing-heading-in-file  remark-validate-links',
            '',
            'github.md',
            '     5:37-5:51  warning  Link to unknown heading: `world`                          missing-heading          remark-validate-links',
            '  19:34-19:102  warning  Link to unknown file: `examples/world.md`                 missing-file             remark-validate-links',
            '   21:12-21:81  warning  Link to unknown file: `examples/world.md`                 missing-file             remark-validate-links',
            '   23:10-23:37  warning  Link to unknown file: `examples/world.md`                 missing-file             remark-validate-links',
            '   25:10-25:35  warning  Link to unknown file: `examples/world.md`                 missing-file             remark-validate-links',
            '   37:10-37:41  warning  Link to unknown heading in `examples/github.md`: `world`  missing-heading-in-file  remark-validate-links',
            '   39:10-39:39  warning  Link to unknown heading in `examples/github.md`: `world`  missing-heading-in-file  remark-validate-links',
            '   41:10-41:82  warning  Link to unknown heading in `examples/github.md`: `world`  missing-heading-in-file  remark-validate-links',
            '   43:10-43:83  warning  Link to unknown heading in `examples/github.md`: `world`  missing-heading-in-file  remark-validate-links',
            '   45:10-45:40  warning  Link to unknown file: `examples/world.md`                 missing-file             remark-validate-links',
            '   45:10-45:40  warning  Link to unknown heading in `examples/world.md`: `hello`   missing-heading-in-file  remark-validate-links',
            '   47:10-47:38  warning  Link to unknown file: `examples/world.md`                 missing-file             remark-validate-links',
            '   47:10-47:38  warning  Link to unknown heading in `examples/world.md`: `hello`   missing-heading-in-file  remark-validate-links',
            '   49:10-49:81  warning  Link to unknown file: `examples/world.md`                 missing-file             remark-validate-links',
            '   49:10-49:81  warning  Link to unknown heading in `examples/world.md`: `hello`   missing-heading-in-file  remark-validate-links',
            '   51:10-51:82  warning  Link to unknown file: `examples/world.md`                 missing-file             remark-validate-links',
            '   51:10-51:82  warning  Link to unknown heading in `examples/world.md`: `hello`   missing-heading-in-file  remark-validate-links',
            '',
            '⚠ 30 warnings'
          ].join('\n'),
          'should report'
        )
      },
      function(err) {
        clean()
        st.error(err)
      }
    )
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
          '  19:34-19:104  warning  Link to unknown file: `examples/world.md`                    missing-file             remark-validate-links',
          '   21:12-21:83  warning  Link to unknown file: `examples/world.md`                    missing-file             remark-validate-links',
          '   23:10-23:37  warning  Link to unknown file: `examples/world.md`                    missing-file             remark-validate-links',
          '   25:10-25:35  warning  Link to unknown file: `examples/world.md`                    missing-file             remark-validate-links',
          '   37:10-37:60  warning  Link to unknown heading in `examples/bitbucket.md`: `world`  missing-heading-in-file  remark-validate-links',
          '   39:10-39:58  warning  Link to unknown heading in `examples/bitbucket.md`: `world`  missing-heading-in-file  remark-validate-links',
          '  41:10-41:103  warning  Link to unknown heading in `examples/bitbucket.md`: `world`  missing-heading-in-file  remark-validate-links',
          '  43:10-43:104  warning  Link to unknown heading in `examples/bitbucket.md`: `world`  missing-heading-in-file  remark-validate-links',
          '   45:10-45:56  warning  Link to unknown file: `examples/world.md`                    missing-file             remark-validate-links',
          '   45:10-45:56  warning  Link to unknown heading in `examples/world.md`: `hello`      missing-heading-in-file  remark-validate-links',
          '   47:10-47:54  warning  Link to unknown file: `examples/world.md`                    missing-file             remark-validate-links',
          '   47:10-47:54  warning  Link to unknown heading in `examples/world.md`: `hello`      missing-heading-in-file  remark-validate-links',
          '   49:10-49:99  warning  Link to unknown file: `examples/world.md`                    missing-file             remark-validate-links',
          '   49:10-49:99  warning  Link to unknown heading in `examples/world.md`: `hello`      missing-heading-in-file  remark-validate-links',
          '  51:10-51:100  warning  Link to unknown file: `examples/world.md`                    missing-file             remark-validate-links',
          '  51:10-51:100  warning  Link to unknown heading in `examples/world.md`: `hello`      missing-heading-in-file  remark-validate-links',
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

  t.test('should recognize github links to particular lines', function(st) {
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
          '  19:10-19:50  warning  Link to unknown file: `examples/missing.jpg`  missing-file  remark-validate-links',
          '  21:12-21:42  warning  Link to unknown file: `examples/missing.jpg`  missing-file  remark-validate-links',
          '  23:10-23:91  warning  Link to unknown file: `examples/missing.jpg`  missing-file  remark-validate-links',
          '  25:10-25:49  warning  Link to unknown file: `examples/missing.jpg`  missing-file  remark-validate-links',
          '  27:10-27:49  warning  Link to unknown file: `examples/missing.jpg`  missing-file  remark-validate-links',
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
    ]).then(function(result) {
      st.equal(strip(result.stderr), [''].join('m'), 'should report')
    }, st.error)
  })

  t.end()
})
