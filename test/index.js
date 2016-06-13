/**
 * @author Titus Wormer
 * @copyright 2015 Titus Wormer
 * @license MIT
 * @module remark:validate-links:test
 * @fileoverview Test suite for `remark-validate-links`.
 */

'use strict';

/* eslint-env node */
/* jscs:disable jsDoc */
/* jscs:disable maximumLineLength */

/* Dependencies. */
var fs = require('fs');
var path = require('path');
var test = require('tape');
var execa = require('execa');
var remark = require('remark');
var links = require('..');

/* Constants. */
process.chdir(path.resolve(process.cwd(), 'test', 'fixtures'));

test.onFinish(function () {
    process.chdir(path.resolve(process.cwd(), '..', '..'));
});

var bin = path.join('..', '..', 'node_modules', '.bin', 'remark');

/* Tests. */
test('remark-validate-links', function (t) {
    t.plan(8);

    t.throws(
        function () {
            remark().use(links);
        },
        /Error: remark-validate-links only works on the CLI/,
        'should throw an error when not on the CLI'
    );

    t.test('should ignore unfound files', function (st) {
        st.plan(2);

        execa.stderr(bin, [
            '--no-config',
            '--no-ignore',
            '--use',
            '.',
            'definitions.md',
            'FOOOO'
        ]).catch(function (err) {
            st.equal(err.code, 1, 'should exit with `1`');
            st.equal(
                err.stderr,
                [
                    'FOOOO',
                    '        1:1  error    No such file or directory',
                    '',
                    'definitions.md',
                    '  5:12-5:21  warning  Link to unknown heading: `world`',
                    '',
                    '2 messages (✖ 1 error, ⚠ 1 warning)',
                    ''
                ].join('\n'),
                'should report'
            );
        });
    });

    t.test('should work when not all files are given', function (st) {
        st.plan(1);

        execa.stderr(bin, [
            '--no-config',
            '--no-ignore',
            '--use',
            '.',
            'example.md'
        ]).then(function (stderr) {
            st.equal(
                stderr,
                [
                    'example.md',
                    '  5:37-5:51    warning  Link to unknown heading: `world`',
                    '  23:10-23:37  warning  Link to unknown file: `examples/world.md`',
                    '  25:10-25:35  warning  Link to unknown file: `examples/world.md`',
                    '  37:10-37:42  warning  Link to unknown heading in `examples/example.md`: `world`',
                    '  39:10-39:40  warning  Link to unknown heading in `examples/example.md`: `world`',
                    '  45:10-45:40  warning  Link to unknown file: `examples/world.md`',
                    '  45:10-45:40  warning  Link to unknown heading in `examples/world.md`: `hello`',
                    '  47:10-47:38  warning  Link to unknown file: `examples/world.md`',
                    '  47:10-47:38  warning  Link to unknown heading in `examples/world.md`: `hello`',
                    '',
                    '⚠ 9 warnings'
                ].join('\n'),
                'should report'
            );
        });
    });

    t.test('should work when all files are given', function (st) {
        st.plan(1);

        execa.stderr(bin, [
            '--no-config',
            '--no-ignore',
            '--use',
            '.',
            'example.md',
            'examples/example.md'
        ]).then(function (stderr) {
            st.equal(
                stderr,
                [
                    'example.md',
                    '  5:37-5:51    warning  Link to unknown heading: `world`',
                    '  23:10-23:37  warning  Link to unknown file: `examples/world.md`',
                    '  25:10-25:35  warning  Link to unknown file: `examples/world.md`',
                    '  37:10-37:42  warning  Link to unknown heading in `examples/example.md`: `world`',
                    '  39:10-39:40  warning  Link to unknown heading in `examples/example.md`: `world`',
                    '  45:10-45:40  warning  Link to unknown file: `examples/world.md`',
                    '  45:10-45:40  warning  Link to unknown heading in `examples/world.md`: `hello`',
                    '  47:10-47:38  warning  Link to unknown file: `examples/world.md`',
                    '  47:10-47:38  warning  Link to unknown heading in `examples/world.md`: `hello`',
                    '',
                    'examples/example.md',
                    '  5:37-5:51    warning  Link to unknown heading: ' +
                        '`world`',
                    '  19:10-19:29  warning  Link to unknown file: ' +
                        '`world.md`',
                    '  29:10-29:34  warning  Link to unknown heading in ' +
                        '`example.md`: `world`',
                    '  35:10-35:32  warning  Link to unknown file: ' +
                        '`world.md`',
                    '  35:10-35:32  warning  Link to unknown heading in ' +
                        '`world.md`: `hello`',
                    '',
                    '⚠ 14 warnings'
                ].join('\n'),
                'should report'
            );
        });
    });

    t.test('should work with definitions', function (st) {
        st.plan(1);

        execa.stderr(bin, [
            '--no-config',
            '--no-ignore',
            '--use',
            '.',
            'definitions.md'
        ]).then(function (stderr) {
            st.equal(
                stderr,
                [
                    'definitions.md',
                    '  5:12-5:21  warning  Link to unknown heading: `world`',
                    '',
                    '⚠ 1 warning'
                ].join('\n'),
                'should report'
            );
        });
    });

    t.test('should work on GitHub URLs when given a repo', function (st) {
        st.plan(1);

        execa.stderr(bin, [
            '--no-config',
            '--no-ignore',
            '--use',
            '.=repository:"wooorm/test"',
            'example.md',
            'examples/example.md'
        ]).then(function (stderr) {
            st.equal(
                stderr,
                [
                    'example.md',
                    '  5:37-5:51     warning  Link to unknown heading: ' +
                        '`world`',
                    '  19:34-19:102  warning  Link to unknown file: ' +
                        '`examples/world.md`',
                    '  21:12-21:81   warning  Link to unknown file: ' +
                        '`examples/world.md`',
                    '  23:10-23:37   warning  Link to unknown file: ' +
                        '`examples/world.md`',
                    '  25:10-25:35   warning  Link to unknown file: ' +
                        '`examples/world.md`',
                    '  37:10-37:42   warning  Link to unknown heading in ' +
                        '`examples/example.md`: `world`',
                    '  39:10-39:40   warning  Link to unknown heading in ' +
                        '`examples/example.md`: `world`',
                    '  41:10-41:83   warning  Link to unknown heading in ' +
                        '`examples/example.md`: `world`',
                    '  43:10-43:84   warning  Link to unknown heading in ' +
                        '`examples/example.md`: `world`',
                    '  45:10-45:40   warning  Link to unknown file: ' +
                        '`examples/world.md`',
                    '  45:10-45:40   warning  Link to unknown heading in ' +
                        '`examples/world.md`: `hello`',
                    '  47:10-47:38   warning  Link to unknown file: ' +
                        '`examples/world.md`',
                    '  47:10-47:38   warning  Link to unknown heading in ' +
                        '`examples/world.md`: `hello`',
                    '  49:10-49:81   warning  Link to unknown file: ' +
                        '`examples/world.md`',
                    '  49:10-49:81   warning  Link to unknown heading in ' +
                        '`examples/world.md`: `hello`',
                    '  51:10-51:82   warning  Link to unknown heading in ' +
                        '`examples/world.md`: `hello`',
                    '  51:10-51:82   warning  Link to unknown file: ' +
                        '`examples/world.md`',
                    '',
                    'examples/example.md',
                    '  5:37-5:51    warning  Link to unknown heading: ' +
                        '`world`',
                    '  15:34-15:93  warning  Link to unknown file: ' +
                        '`world.md`',
                    '  17:12-17:72  warning  Link to unknown file: ' +
                        '`world.md`',
                    '  19:10-19:29  warning  Link to unknown file: ' +
                        '`world.md`',
                    '  29:10-29:34  warning  Link to unknown heading in ' +
                        '`example.md`: `world`',
                    '  31:10-31:74  warning  Link to unknown heading in ' +
                        '`example.md`: `world`',
                    '  33:10-33:75  warning  Link to unknown heading in ' +
                        '`example.md`: `world`',
                    '  35:10-35:32  warning  Link to unknown file: ' +
                        '`world.md`',
                    '  35:10-35:32  warning  Link to unknown heading in ' +
                        '`world.md`: `hello`',
                    '  37:10-37:72  warning  Link to unknown file: ' +
                        '`world.md`',
                    '  37:10-37:72  warning  Link to unknown heading in ' +
                        '`world.md`: `hello`',
                    '  39:10-39:73  warning  Link to unknown heading in ' +
                        '`world.md`: `hello`',
                    '  39:10-39:73  warning  Link to unknown file: ' +
                        '`world.md`',
                    '',
                    '⚠ 30 warnings'
                ].join('\n'),
                'should report'
            );
        });
    });

    t.test('should work on GitHub URLs when with package.json', function (st) {
        st.plan(1);

        /* cwd is moved to `test/fixtures`. */
        fs.writeFileSync('./package.json', JSON.stringify({
            'repository': 'wooorm/test'
        }, 0, 2));

        function clean() {
            fs.unlinkSync('./package.json');
        }

        execa.stderr(bin, [
            '--no-config',
            '--no-ignore',
            '--use',
            '../..',
            'example.md',
            'examples/example.md'
        ]).then(function (stderr) {
            clean();
            st.equal(
                stderr,
                [
                    'example.md',
                    '  5:37-5:51     warning  Link to unknown heading: ' +
                        '`world`',
                    '  19:34-19:102  warning  Link to unknown file: ' +
                        '`examples/world.md`',
                    '  21:12-21:81   warning  Link to unknown file: ' +
                        '`examples/world.md`',
                    '  23:10-23:37   warning  Link to unknown file: ' +
                        '`examples/world.md`',
                    '  25:10-25:35   warning  Link to unknown file: ' +
                        '`examples/world.md`',
                    '  37:10-37:42   warning  Link to unknown heading in ' +
                        '`examples/example.md`: `world`',
                    '  39:10-39:40   warning  Link to unknown heading in ' +
                        '`examples/example.md`: `world`',
                    '  41:10-41:83   warning  Link to unknown heading in ' +
                        '`examples/example.md`: `world`',
                    '  43:10-43:84   warning  Link to unknown heading in ' +
                        '`examples/example.md`: `world`',
                    '  45:10-45:40   warning  Link to unknown file: ' +
                        '`examples/world.md`',
                    '  45:10-45:40   warning  Link to unknown heading in ' +
                        '`examples/world.md`: `hello`',
                    '  47:10-47:38   warning  Link to unknown file: ' +
                        '`examples/world.md`',
                    '  47:10-47:38   warning  Link to unknown heading in ' +
                        '`examples/world.md`: `hello`',
                    '  49:10-49:81   warning  Link to unknown file: ' +
                        '`examples/world.md`',
                    '  49:10-49:81   warning  Link to unknown heading in ' +
                        '`examples/world.md`: `hello`',
                    '  51:10-51:82   warning  Link to unknown heading in ' +
                        '`examples/world.md`: `hello`',
                    '  51:10-51:82   warning  Link to unknown file: ' +
                        '`examples/world.md`',
                    '',
                    'examples/example.md',
                    '  5:37-5:51    warning  Link to unknown heading: ' +
                        '`world`',
                    '  15:34-15:93  warning  Link to unknown file: ' +
                        '`world.md`',
                    '  17:12-17:72  warning  Link to unknown file: ' +
                        '`world.md`',
                    '  19:10-19:29  warning  Link to unknown file: ' +
                        '`world.md`',
                    '  29:10-29:34  warning  Link to unknown heading in ' +
                        '`example.md`: `world`',
                    '  31:10-31:74  warning  Link to unknown heading in ' +
                        '`example.md`: `world`',
                    '  33:10-33:75  warning  Link to unknown heading in ' +
                        '`example.md`: `world`',
                    '  35:10-35:32  warning  Link to unknown file: ' +
                        '`world.md`',
                    '  35:10-35:32  warning  Link to unknown heading in ' +
                        '`world.md`: `hello`',
                    '  37:10-37:72  warning  Link to unknown file: ' +
                        '`world.md`',
                    '  37:10-37:72  warning  Link to unknown heading in ' +
                        '`world.md`: `hello`',
                    '  39:10-39:73  warning  Link to unknown heading in ' +
                        '`world.md`: `hello`',
                    '  39:10-39:73  warning  Link to unknown file: ' +
                        '`world.md`',
                    '',
                    '⚠ 30 warnings'
                ].join('\n'),
                'should report'
            );
        }, clean);
    });

    t.test('should suggest similar links', function (st) {
        st.plan(1);

        execa.stderr(bin, [
            '--no-config',
            '--no-ignore',
            '--use',
            '.',
            'suggestions.md'
        ]).then(function (stderr) {
            st.equal(
                stderr,
                [
                    'suggestions.md',
                    '  3:22-3:37  warning  Link to unknown heading: ' +
                        '`helloo`. Did you mean `hello`',
                    '  7:17-7:40  warning  Link to unknown heading in ' +
                        '`example.md`: `fiiiles`. Did you mean `files`',
                    '',
                    '⚠ 2 warnings'
                ].join('\n'),
                'should report'
            );
        });
    });
});
