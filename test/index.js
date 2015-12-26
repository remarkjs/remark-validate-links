/**
 * @author Titus Wormer
 * @copyright 2015 Titus Wormer
 * @license MIT
 * @module remark:validate-links:test
 * @fileoverview Test suite for `remark-validate-links`.
 */

'use strict';

/* eslint-env mocha */

/*
 * Dependencies.
 */

var assert = require('assert');
var hook = require('hook-std');
var fs = require('fs');
var remark = require('remark');
var cli = require('remark/lib/cli');
var links = require('..');

/*
 * Methods.
 */

var equal = assert.strictEqual;

/**
 * Test the cli.
 *
 * @param {Object} config - Configuration.
 * @param {Function} callback - Completion handler.
 */
function test(config, callback) {
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

describe('remark-validate-links', function () {
    beforeEach(function () {
        process.chdir('./test/fixtures');
    });

    afterEach(function () {
        process.chdir('../..');
    });

    it('should throw an error when not on the CLI', function () {
        assert.throws(function () {
            remark().use(links);
        }, /Error: remark-validate-links only works on the CLI/);
    });

    it('should warn when used without slugs', function (done) {
        test({
            'files': 'example.md',
            'color': false,
            'detectRC': false,
            'detectIgnore': false,
            'plugins': [
                '../../../index.js'
            ]
        }, function (err, res) {
            equal(res.stderr.split('\n').slice(0, 2).join('\n'), [
                'example.md',
                '        1:1  error    Error: Missing slugs. Use for ' +
                    'example `remark-slug` to generate heading IDs'
            ].join('\n'));

            done(err);
        });
    });

    it('should ignore unfound files', function (done) {
        test({
            'files': ['definitions.md', 'FOOOO'],
            'color': false,
            'detectRC': false,
            'detectIgnore': false,
            'plugins': [
                '../../../node_modules/remark-slug',
                '../../../index.js'
            ]
        }, function (err, res) {
            equal(res.stdout, '');

            equal(res.stderr, [
                'FOOOO',
                '        1:1  error    No such file or directory',
                '',
                'definitions.md',
                '  5:12-5:21  warning  Link to unknown heading: `world`',
                '',
                '2 messages (✖ 1 error, ⚠ 1 warning)',
                ''
            ].join('\n'));

            done(err);
        });
    });

    it('should work when not all files are given', function (done) {
        test({
            'files': 'example.md',
            'color': false,
            'detectRC': false,
            'detectIgnore': false,
            'plugins': [
                '../../../node_modules/remark-slug',
                '../../../index.js'
            ]
        }, function (err, res) {
            equal(res.stderr, [
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
            ].join('\n'));

            done(err);
        });
    });

    it('should work when all files are given', function (done) {
        test({
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
            equal(res.stdout, '');

            equal(res.stderr, [
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
            ].join('\n'));

            done(err);
        });
    });

    it('should work with definitions', function (done) {
        test({
            'files': 'definitions.md',
            'color': false,
            'detectRC': false,
            'detectIgnore': false,
                'plugins': [
                    '../../../node_modules/remark-slug',
                    '../../../index.js'
                ]
        }, function (err, res) {
            equal(res.stderr, [
                'definitions.md',
                '  5:12-5:21  warning  Link to unknown heading: `world`',
                '',
                '⚠ 1 warning',
                ''
            ].join('\n'));

            done(err);
        });
    });

    it('should work on GitHub URLs when given a repo', function (done) {
        test({
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
            equal(res.stdout, '');

            equal(res.stderr, [
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
            ].join('\n'));

            done(err);
        });
    });

    it('should work on GitHub URLs when with package.json', function (done) {
        fs.writeFileSync('./package.json', JSON.stringify({
            'repository': 'wooorm/test'
        }, 0, 2));

        test({
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

            equal(res.stderr, [
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
            ].join('\n'));

            done(err);
        });
    });

    it('should suggest similar links', function (done) {
        test({
            'files': ['suggestions.md'],
            'color': false,
            'detectRC': false,
            'detectIgnore': false,
            'plugins': [
                '../../../node_modules/remark-slug',
                '../../../index.js'
            ]
        }, function (err, res) {
            equal(res.stderr, [
                'suggestions.md',
                '  3:22-3:37  warning  Link to unknown heading: `helloo`. ' +
                    'Did you mean `hello`',
                '  7:17-7:40  warning  Link to unknown heading in ' +
                    '`example.md`: `fiiiles`. Did you mean `files`',
                '',
                '⚠ 2 warnings',
                ''
            ].join('\n'));

            done(err);
        });
    });
});
