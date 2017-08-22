'use strict';

var fs = require('fs');
var path = require('path');
var test = require('tape');
var execa = require('execa');
var vfile = require('to-vfile');
var remark = require('remark');
var strip = require('strip-ansi');
var links = require('..');

process.chdir(path.resolve(process.cwd(), 'test', 'fixtures'));

test.onFinish(function () {
  process.chdir(path.resolve(process.cwd(), '..', '..'));
});

var bin = path.join('..', '..', 'node_modules', '.bin', 'remark');

var source = '  remark-validate-links  remark-validate-links';

test('remark-validate-links', function (t) {
  t.plan(12);

  t.test('should work on the API', function (st) {
    st.plan(1);

    remark()
      .use(links)
      .process(vfile.readSync('github.md'), function (err, file) {
        st.deepEqual(
          [err].concat(file.messages.map(String)),
          [
            null,
            'github.md:5:37-5:51: Link to unknown heading: `world`'
          ],
          'should report messages'
        );
      });
  });

  t.test('should throw on unparsable git repositories', function (st) {
    st.plan(1);

    execa(bin, [
      '--no-config',
      '--no-ignore',
      '--use',
      '../..=repository:"invalid:shortcode"',
      'definitions.md'
    ]).then(function () {
      st.fail('should not be successful');
    }, function (err) {
      st.equal(
        strip(err.stderr).split('\n').slice(0, 2).join('\n'),
        [
          'definitions.md',
          '  1:1  error  Error: remark-validate-links cannot parse `repository` (`invalid:shortcode`)'
        ].join('\n'),
        'should report an error'
      );
    });
  });

  t.test('should throw on gist repositories', function (st) {
    st.plan(1);

    execa(bin, [
      '--no-config',
      '--no-ignore',
      '--use',
      '../..=repository:"gist:wooorm/8504606"',
      'definitions.md'
    ]).then(function () {
      st.fail('should not be successful');
    }, function (err) {
      st.equal(
        strip(err.stderr).split('\n').slice(0, 2).join('\n'),
        [
          'definitions.md',
          '  1:1  error  Error: remark-validate-links does not support gist repositories'
        ].join('\n'),
        'should report an error'
      );
    });
  });

  t.test('should ignore unfound files', function (st) {
    st.plan(1);

    execa(bin, [
      '--no-config',
      '--no-ignore',
      '--use',
      '../..',
      'definitions.md',
      'FOOOO'
    ]).then(function () {
      st.fail('should not be successful');
    }, function (err) {
      st.equal(
        strip(err.stderr),
        [
          'FOOOO',
          '        1:1  error    No such file or directory',
          '',
          'definitions.md',
          '  5:12-5:21  warning  Link to unknown heading: `world`' + source,
          '',
          '2 messages (✖ 1 error, ⚠ 1 warning)',
          ''
        ].join('\n'),
        'should report an error'
      );
    });
  });

  t.test('should work when not all files are given', function (st) {
    st.plan(1);

    execa(bin, [
      '--no-config',
      '--no-ignore',
      '--use',
      '../..',
      'github.md'
    ]).then(function (result) {
      st.equal(
        strip(result.stderr),
        [
          'github.md',
          '    5:37-5:51  warning  Link to unknown heading: `world`                        ' + source,
          '  23:10-23:37  warning  Link to unknown file: `examples/world.md`               ' + source,
          '  25:10-25:35  warning  Link to unknown file: `examples/world.md`               ' + source,
          '  37:10-37:41  warning  Link to unknown heading in `examples/github.md`: `world`' + source,
          '  39:10-39:39  warning  Link to unknown heading in `examples/github.md`: `world`' + source,
          '  45:10-45:40  warning  Link to unknown file: `examples/world.md`               ' + source,
          '  45:10-45:40  warning  Link to unknown heading in `examples/world.md`: `hello` ' + source,
          '  47:10-47:38  warning  Link to unknown file: `examples/world.md`               ' + source,
          '  47:10-47:38  warning  Link to unknown heading in `examples/world.md`: `hello` ' + source,
          '',
          '⚠ 9 warnings'
        ].join('\n'),
        'should report'
      );
    }, st.error);
  });

  t.test('should work when all files are given', function (st) {
    st.plan(1);

    execa(bin, [
      '--no-config',
      '--no-ignore',
      '--use',
      '../..',
      'github.md',
      'examples/github.md'
    ]).then(function (result) {
      st.equal(
        strip(result.stderr),
        [
          'examples/github.md',
          '    5:37-5:51  warning  Link to unknown heading: `world`                        ' + source,
          '  19:10-19:29  warning  Link to unknown file: `world.md`                        ' + source,
          '  29:10-29:33  warning  Link to unknown heading in `github.md`: `world`         ' + source,
          '  35:10-35:32  warning  Link to unknown file: `world.md`                        ' + source,
          '  35:10-35:32  warning  Link to unknown heading in `world.md`: `hello`          ' + source,
          '',
          'github.md',
          '    5:37-5:51  warning  Link to unknown heading: `world`                        ' + source,
          '  23:10-23:37  warning  Link to unknown file: `examples/world.md`               ' + source,
          '  25:10-25:35  warning  Link to unknown file: `examples/world.md`               ' + source,
          '  37:10-37:41  warning  Link to unknown heading in `examples/github.md`: `world`' + source,
          '  39:10-39:39  warning  Link to unknown heading in `examples/github.md`: `world`' + source,
          '  45:10-45:40  warning  Link to unknown file: `examples/world.md`               ' + source,
          '  45:10-45:40  warning  Link to unknown heading in `examples/world.md`: `hello` ' + source,
          '  47:10-47:38  warning  Link to unknown file: `examples/world.md`               ' + source,
          '  47:10-47:38  warning  Link to unknown heading in `examples/world.md`: `hello` ' + source,
          '',
          '⚠ 14 warnings'
        ].join('\n'),
        'should report'
      );
    }, st.error);
  });

  t.test('should work with definitions', function (st) {
    st.plan(1);

    execa(bin, [
      '--no-config',
      '--no-ignore',
      '--use',
      '../..',
      'definitions.md'
    ]).then(function (result) {
      st.equal(
        strip(result.stderr),
        [
          'definitions.md',
          '  5:12-5:21  warning  Link to unknown heading: `world`' + source,
          '',
          '⚠ 1 warning'
        ].join('\n'),
        'should report'
      );
    }, st.error);
  });

  t.test('should work on GitHub URLs when given a repo', function (st) {
    st.plan(1);

    execa(bin, [
      '--no-config',
      '--no-ignore',
      '--use',
      '../..=repository:"wooorm/test"',
      'github.md',
      'examples/github.md'
    ]).then(function (result) {
      st.equal(
        strip(result.stderr),
        [
          'examples/github.md',
          '     5:37-5:51  warning  Link to unknown heading: `world`                        ' + source,
          '   15:34-15:93  warning  Link to unknown file: `world.md`                        ' + source,
          '   17:12-17:72  warning  Link to unknown file: `world.md`                        ' + source,
          '   19:10-19:29  warning  Link to unknown file: `world.md`                        ' + source,
          '   29:10-29:33  warning  Link to unknown heading in `github.md`: `world`         ' + source,
          '   31:10-31:73  warning  Link to unknown heading in `github.md`: `world`         ' + source,
          '   33:10-33:74  warning  Link to unknown heading in `github.md`: `world`         ' + source,
          '   35:10-35:32  warning  Link to unknown file: `world.md`                        ' + source,
          '   35:10-35:32  warning  Link to unknown heading in `world.md`: `hello`          ' + source,
          '   37:10-37:72  warning  Link to unknown file: `world.md`                        ' + source,
          '   37:10-37:72  warning  Link to unknown heading in `world.md`: `hello`          ' + source,
          '   39:10-39:73  warning  Link to unknown heading in `world.md`: `hello`          ' + source,
          '   39:10-39:73  warning  Link to unknown file: `world.md`                        ' + source,
          '',
          'github.md',
          '     5:37-5:51  warning  Link to unknown heading: `world`                        ' + source,
          '  19:34-19:102  warning  Link to unknown file: `examples/world.md`               ' + source,
          '   21:12-21:81  warning  Link to unknown file: `examples/world.md`               ' + source,
          '   23:10-23:37  warning  Link to unknown file: `examples/world.md`               ' + source,
          '   25:10-25:35  warning  Link to unknown file: `examples/world.md`               ' + source,
          '   37:10-37:41  warning  Link to unknown heading in `examples/github.md`: `world`' + source,
          '   39:10-39:39  warning  Link to unknown heading in `examples/github.md`: `world`' + source,
          '   41:10-41:82  warning  Link to unknown heading in `examples/github.md`: `world`' + source,
          '   43:10-43:83  warning  Link to unknown heading in `examples/github.md`: `world`' + source,
          '   45:10-45:40  warning  Link to unknown file: `examples/world.md`               ' + source,
          '   45:10-45:40  warning  Link to unknown heading in `examples/world.md`: `hello` ' + source,
          '   47:10-47:38  warning  Link to unknown file: `examples/world.md`               ' + source,
          '   47:10-47:38  warning  Link to unknown heading in `examples/world.md`: `hello` ' + source,
          '   49:10-49:81  warning  Link to unknown file: `examples/world.md`               ' + source,
          '   49:10-49:81  warning  Link to unknown heading in `examples/world.md`: `hello` ' + source,
          '   51:10-51:82  warning  Link to unknown heading in `examples/world.md`: `hello` ' + source,
          '   51:10-51:82  warning  Link to unknown file: `examples/world.md`               ' + source,
          '',
          '⚠ 30 warnings'
        ].join('\n'),
        'should report'
      );
    }, st.error);
  });

  t.test('should work on GitHub URLs when with package.json', function (st) {
    st.plan(1);

    /* `cwd` is moved to `test/fixtures`. */
    fs.writeFileSync('./package.json', JSON.stringify({
      repository: 'wooorm/test'
    }, 0, 2));

    function clean() {
      fs.unlinkSync('./package.json');
    }

    execa(bin, [
      '--no-config',
      '--no-ignore',
      '--use',
      '../..',
      'github.md',
      'examples/github.md'
    ]).then(function (result) {
      clean();
      st.equal(
        strip(result.stderr),
        [
          'examples/github.md',
          '     5:37-5:51  warning  Link to unknown heading: `world`                        ' + source,
          '   15:34-15:93  warning  Link to unknown file: `world.md`                        ' + source,
          '   17:12-17:72  warning  Link to unknown file: `world.md`                        ' + source,
          '   19:10-19:29  warning  Link to unknown file: `world.md`                        ' + source,
          '   29:10-29:33  warning  Link to unknown heading in `github.md`: `world`         ' + source,
          '   31:10-31:73  warning  Link to unknown heading in `github.md`: `world`         ' + source,
          '   33:10-33:74  warning  Link to unknown heading in `github.md`: `world`         ' + source,
          '   35:10-35:32  warning  Link to unknown file: `world.md`                        ' + source,
          '   35:10-35:32  warning  Link to unknown heading in `world.md`: `hello`          ' + source,
          '   37:10-37:72  warning  Link to unknown file: `world.md`                        ' + source,
          '   37:10-37:72  warning  Link to unknown heading in `world.md`: `hello`          ' + source,
          '   39:10-39:73  warning  Link to unknown heading in `world.md`: `hello`          ' + source,
          '   39:10-39:73  warning  Link to unknown file: `world.md`                        ' + source,
          '',
          'github.md',
          '     5:37-5:51  warning  Link to unknown heading: `world`                        ' + source,
          '  19:34-19:102  warning  Link to unknown file: `examples/world.md`               ' + source,
          '   21:12-21:81  warning  Link to unknown file: `examples/world.md`               ' + source,
          '   23:10-23:37  warning  Link to unknown file: `examples/world.md`               ' + source,
          '   25:10-25:35  warning  Link to unknown file: `examples/world.md`               ' + source,
          '   37:10-37:41  warning  Link to unknown heading in `examples/github.md`: `world`' + source,
          '   39:10-39:39  warning  Link to unknown heading in `examples/github.md`: `world`' + source,
          '   41:10-41:82  warning  Link to unknown heading in `examples/github.md`: `world`' + source,
          '   43:10-43:83  warning  Link to unknown heading in `examples/github.md`: `world`' + source,
          '   45:10-45:40  warning  Link to unknown file: `examples/world.md`               ' + source,
          '   45:10-45:40  warning  Link to unknown heading in `examples/world.md`: `hello` ' + source,
          '   47:10-47:38  warning  Link to unknown file: `examples/world.md`               ' + source,
          '   47:10-47:38  warning  Link to unknown heading in `examples/world.md`: `hello` ' + source,
          '   49:10-49:81  warning  Link to unknown file: `examples/world.md`               ' + source,
          '   49:10-49:81  warning  Link to unknown heading in `examples/world.md`: `hello` ' + source,
          '   51:10-51:82  warning  Link to unknown heading in `examples/world.md`: `hello` ' + source,
          '   51:10-51:82  warning  Link to unknown file: `examples/world.md`               ' + source,
          '',
          '⚠ 30 warnings'
        ].join('\n'),
        'should report'
      );
    }, function (err) {
      clean();
      st.error(err);
    });
  });

  t.test('should support a GitLab shortcode', function (st) {
    st.plan(1);

    execa(bin, [
      '--no-config',
      '--no-ignore',
      '--use',
      '../..=repository:"gitlab:wooorm/test"',
      'gitlab.md'
    ]).then(function (result) {
      st.equal(
        strip(result.stderr),
        [
          'gitlab.md',
          '     5:37-5:51  warning  Link to unknown heading: `world`                                            ' + source,
          '  19:34-19:102  warning  Link to unknown file: `examples/world.md`. Did you mean `examples/gitlab.md`' + source,
          '   21:12-21:81  warning  Link to unknown file: `examples/world.md`. Did you mean `examples/gitlab.md`' + source,
          '   23:10-23:37  warning  Link to unknown file: `examples/world.md`. Did you mean `examples/gitlab.md`' + source,
          '   25:10-25:35  warning  Link to unknown file: `examples/world.md`. Did you mean `examples/gitlab.md`' + source,
          '   37:10-37:41  warning  Link to unknown heading in `examples/gitlab.md`: `world`                    ' + source,
          '   39:10-39:39  warning  Link to unknown heading in `examples/gitlab.md`: `world`                    ' + source,
          '   41:10-41:82  warning  Link to unknown heading in `examples/gitlab.md`: `world`                    ' + source,
          '   43:10-43:83  warning  Link to unknown heading in `examples/gitlab.md`: `world`                    ' + source,
          '   45:10-45:40  warning  Link to unknown file: `examples/world.md`. Did you mean `examples/gitlab.md`' + source,
          '   45:10-45:40  warning  Link to unknown heading in `examples/world.md`: `hello`                     ' + source,
          '   47:10-47:38  warning  Link to unknown file: `examples/world.md`. Did you mean `examples/gitlab.md`' + source,
          '   47:10-47:38  warning  Link to unknown heading in `examples/world.md`: `hello`                     ' + source,
          '   49:10-49:81  warning  Link to unknown file: `examples/world.md`. Did you mean `examples/gitlab.md`' + source,
          '   49:10-49:81  warning  Link to unknown heading in `examples/world.md`: `hello`                     ' + source,
          '   51:10-51:82  warning  Link to unknown heading in `examples/world.md`: `hello`                     ' + source,
          '   51:10-51:82  warning  Link to unknown file: `examples/world.md`. Did you mean `examples/gitlab.md`' + source,
          '',
          '⚠ 17 warnings'
        ].join('\n'),
        'should report'
      );
    }, st.error);
  });

  t.test('should support a Bitbucket shortcode', function (st) {
    st.plan(1);

    execa(bin, [
      '--no-config',
      '--no-ignore',
      '--use',
      '../..=repository:"bitbucket:wooorm/test"',
      'bitbucket.md'
    ]).then(function (result) {
      st.equal(
        strip(result.stderr),
        [
          'bitbucket.md',
          '     5:37-5:67  warning  Link to unknown heading: `world`                           ' + source,
          '  19:34-19:104  warning  Link to unknown file: `examples/world.md`                  ' + source,
          '   21:12-21:83  warning  Link to unknown file: `examples/world.md`                  ' + source,
          '   23:10-23:37  warning  Link to unknown file: `examples/world.md`                  ' + source,
          '   25:10-25:35  warning  Link to unknown file: `examples/world.md`                  ' + source,
          '   37:10-37:60  warning  Link to unknown heading in `examples/bitbucket.md`: `world`' + source,
          '   39:10-39:58  warning  Link to unknown heading in `examples/bitbucket.md`: `world`' + source,
          '  41:10-41:103  warning  Link to unknown heading in `examples/bitbucket.md`: `world`' + source,
          '  43:10-43:104  warning  Link to unknown heading in `examples/bitbucket.md`: `world`' + source,
          '   45:10-45:56  warning  Link to unknown file: `examples/world.md`                  ' + source,
          '   45:10-45:56  warning  Link to unknown heading in `examples/world.md`: `hello`    ' + source,
          '   47:10-47:54  warning  Link to unknown file: `examples/world.md`                  ' + source,
          '   47:10-47:54  warning  Link to unknown heading in `examples/world.md`: `hello`    ' + source,
          '   49:10-49:99  warning  Link to unknown file: `examples/world.md`                  ' + source,
          '   49:10-49:99  warning  Link to unknown heading in `examples/world.md`: `hello`    ' + source,
          '  51:10-51:100  warning  Link to unknown heading in `examples/world.md`: `hello`    ' + source,
          '  51:10-51:100  warning  Link to unknown file: `examples/world.md`                  ' + source,
          '',
          '⚠ 17 warnings'
        ].join('\n'),
        'should report'
      );
    }, st.error);
  });

  t.test('should suggest similar links', function (st) {
    st.plan(1);

    execa(bin, [
      '--no-config',
      '--no-ignore',
      '--use',
      '../..',
      'suggestions.md'
    ]).then(function (result) {
      st.equal(
        strip(result.stderr),
        [
          'suggestions.md',
          '  3:22-3:37  warning  Link to unknown heading: `helloo`. Did you mean `hello`                ' + source,
          '  7:17-7:39  warning  Link to unknown heading in `github.md`: `fiiiles`. Did you mean `files`' + source,
          '',
          '⚠ 2 warnings'
        ].join('\n'),
        'should report'
      );
    }, st.error);
  });
});
