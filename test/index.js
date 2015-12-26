/**
 * @author Titus Wormer
 * @copyright 2015 Titus Wormer
 * @license MIT
 * @module remark:validate-links:test
 * @fileoverview Test suite for `remark-validate-links`.
 */

'use strict';

/* eslint-env node */

/*
 * Dependencies.
 */

var fs = require('fs');
var path = require('path');
var test = require('tape');
var hook = require('hook-std');
var remark = require('remark');
var cli = require('remark/lib/cli');
var links = require('..');

/**
 * Test the cli.
 *
 * @param {Object} config - Configuration.
 * @param {Function} callback - Completion handler.
 */
function assertion(config, callback) {
    var stdout = [];
    var stderr = [];
    var opts = {};
    var unhookStdout;
    var unhookStderr;

    opts.silent = true;

    unhookStdout = hook.stdout(opts, [].push.bind(stdout));
    unhookStderr = hook.stderr(opts, [].push.bind(stderr));

    cli(config, function (err) {
        unhookStdout();
        unhookStderr();

        if (err) {
            return callback(err);
        }

        return callback(null, {
            'stdout': stdout.join(''),
            'stderr': stderr.join('')
        });
    });
}

/*
 * Tests.
 */

process.chdir(path.resolve(process.cwd(), 'test', 'fixtures'));

test.onFinish(function () {
    process.chdir(path.resolve(process.cwd(), '..', '..'));
})

test('remark-validate-links', function (t) {
    // t.plan(1);

    t.throws(
        function () {
            remark().use(links);
        },
        /Error: remark-validate-links only works on the CLI/,
        'should throw an error when not on the CLI'
    );

    t.test('should warn when used without slugs', function (st) {
        assertion({
            'files': 'example.md',
            'color': false,
            'detectRC': false,
            'detectIgnore': false,
            'plugins': [
                '../../../index.js'
            ]
        }, function (err, res) {
            st.ifErr(err);

            st.equal(
                res.stderr.split('\n').slice(0, 2).join('\n'),
                [
                    'example.md',
                    '        1:1  error    Error: Missing slugs. Use for ' +
                        'example `remark-slug` to generate heading IDs'
                ].join('\n')
            );

            st.end();
        });
    });

    t.test('should ignore unfound files', function (st) {
        assertion({
            'files': ['definitions.md', 'FOOOO'],
            'color': false,
            'detectRC': false,
            'detectIgnore': false,
            'plugins': [
                '../../../node_modules/remark-slug',
                '../../../index.js'
            ]
        }, function (err, res) {
            st.ifErr(err);

            st.equal(res.stdout, '');

            st.equal(
                res.stderr,
                [
                    'FOOOO',
                    '        1:1  error    No such file or directory',
                    '',
                    'definitions.md',
                    '  5:12-5:21  warning  Link to unknown heading: `world`',
                    '',
                    '2 messages (✖ 1 error, ⚠ 1 warning)',
                    ''
                ].join('\n')
            );

            st.end();
        });
    })

    t.test('should work when not all files are given', function (st) {
        assertion({
            'files': 'example.md',
            'color': false,
            'detectRC': false,
            'detectIgnore': false,
            'plugins': [
                '../../../node_modules/remark-slug',
                '../../../index.js'
            ]
        }, function (err, res) {
            st.ifErr(err);

            st.equal(
                res.stderr,
                [
                    'example.md',
                    '  5:37-5:51    warning  Link to unknown heading: `world`',
                    '  23:10-23:37  warning  Link to unknown file: ' +
                        '`examples/world.md`',
                    '  25:10-25:35  warning  Link to unknown file: ' +
                        '`examples/world.md`',
                    '  37:10-37:42  warning  Link to unknown heading in ' +
                        '`examples/example.md`: `world`',
                    '  39:10-39:40  warning  Link to unknown heading in ' +
                        '`examples/example.md`: `world`',
                    '  45:10-45:40  warning  Link to unknown file: ' +
                        '`examples/world.md`',
                    '  45:10-45:40  warning  Link to unknown heading in ' +
                        '`examples/world.md`: `hello`',
                    '  47:10-47:38  warning  Link to unknown file: ' +
                        '`examples/world.md`',
                    '  47:10-47:38  warning  Link to unknown heading in ' +
                        '`examples/world.md`: `hello`',
                    '',
                    '⚠ 9 warnings',
                    ''
                ].join('\n')
            );

            st.end();
        });
    })

    t.test('should work when all files are given', function (st) {
        assertion({
            'files': [
                'example.md',
                'examples/example.md'
            ],
            'color': false,
            'detectRC': false,
            'detectIgnore': false,
                'plugins': [
                    '../../../node_modules/remark-slug',
                    '../../../index.js'
                ]
        }, function (err, res) {
            st.ifErr(err);

            st.equal(res.stdout, '');

            st.equal(
                res.stderr,
                [
                    'example.md',
                    '  5:37-5:51    warning  Link to unknown heading: `world`',
                    '  23:10-23:37  warning  Link to unknown file: ' +
                        '`examples/world.md`',
                    '  25:10-25:35  warning  Link to unknown file: ' +
                        '`examples/world.md`',
                    '  37:10-37:42  warning  Link to unknown heading in ' +
                        '`examples/example.md`: `world`',
                    '  39:10-39:40  warning  Link to unknown heading in ' +
                        '`examples/example.md`: `world`',
                    '  45:10-45:40  warning  Link to unknown file: ' +
                        '`examples/world.md`',
                    '  45:10-45:40  warning  Link to unknown heading in ' +
                        '`examples/world.md`: `hello`',
                    '  47:10-47:38  warning  Link to unknown file: ' +
                        '`examples/world.md`',
                    '  47:10-47:38  warning  Link to unknown heading in ' +
                        '`examples/world.md`: `hello`',
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
                    '⚠ 14 warnings',
                    ''
                ].join('\n')
            );

            st.end();
        });
    });

    t.test('should work with definitions', function (st) {
        assertion({
            'files': 'definitions.md',
            'color': false,
            'detectRC': false,
            'detectIgnore': false,
                'plugins': [
                    '../../../node_modules/remark-slug',
                    '../../../index.js'
                ]
        }, function (err, res) {
            st.ifErr(err);

            st.equal(
                res.stderr,
                [
                    'definitions.md',
                    '  5:12-5:21  warning  Link to unknown heading: `world`',
                    '',
                    '⚠ 1 warning',
                    ''
                ].join('\n')
            );

            st.end();
        });
    });

    t.test('should work on GitHub URLs when given a repo', function (st) {
        assertion({
            'files': [
                'example.md',
                'examples/example.md'
            ],
            'color': false,
            'detectRC': false,
            'detectIgnore': false,
            'plugins': {
                '../../../node_modules/remark-slug': null,
                '../../../index.js': {
                    'repository': 'wooorm/test'
                }
            }
        }, function (err, res) {
            st.ifErr(err);

            st.equal(res.stdout, '');

            st.equal(
                res.stderr,
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
                    '⚠ 30 warnings',
                    ''
                ].join('\n')
            );

            st.end();
        });
    });

    t.test('should work on GitHub URLs when with package.json', function (st) {
        fs.writeFileSync('./package.json', JSON.stringify({
            'repository': 'wooorm/test'
        }, 0, 2));

        assertion({
            'files': [
                'example.md',
                'examples/example.md'
            ],
            'color': false,
            'detectRC': false,
            'detectIgnore': false,
                'plugins': [
                    '../../../node_modules/remark-slug',
                    '../../../index.js'
                ]
        }, function (err, res) {
            fs.unlinkSync('./package.json');

            st.ifErr(err);

            st.equal(
                res.stderr,
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
                    '⚠ 30 warnings',
                    ''
                ].join('\n')
            );

            st.end();
        });
    });

    t.test('should suggest similar links', function (st) {
        assertion({
            'files': ['suggestions.md'],
            'color': false,
            'detectRC': false,
            'detectIgnore': false,
            'plugins': [
                '../../../node_modules/remark-slug',
                '../../../index.js'
            ]
        }, function (err, res) {
            st.ifErr(err);

            st.equal(
                res.stderr,
                [
                    'suggestions.md',
                    '  3:22-3:37  warning  Link to unknown heading: `helloo`. ' +
                        'Did you mean `hello`',
                    '  7:17-7:40  warning  Link to unknown heading in ' +
                        '`example.md`: `fiiiles`. Did you mean `files`',
                    '',
                    '⚠ 2 warnings',
                    ''
                ].join('\n')
            );

            st.end();
        });
    });
});
