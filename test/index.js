/**
 * @author Titus Wormer
 * @copyright 2015 Titus Wormer
 * @license MIT
 * @module mdast:validate-links:test
 * @fileoverview Test suite for `mdast-validate-links`.
 */

'use strict';

/* eslint-env mocha */

/*
 * Dependencies.
 */

var assert = require('assert');
var fs = require('fs');
var cept = require('cept');
var mdast = require('mdast');
var cli = require('mdast/lib/cli');
var links = require('..');

/*
 * Methods.
 */

var equal = assert.strictEqual;

/*
 * Cache to store output and errors by mdast.
 */

var std = {
    'out': [],
    'err': []
};

/**
 * Factory to store a bound type.
 *
 * @param {string} type - `"out"` or `"err"`.
 * @return {Function} - Stores the bound type.
 */
function queue(type) {
    /**
     * Store a bound type.
     */
    return function () {
        std[type].push([].slice.call(arguments).join(''));
    };
}

/**
 * Intercept both `console.log` to `std.out` and
 * `console.error` to `std.err`;
 *
 * @return {Function} - Stores output.
 */
function intercept() {
    var stopOut = cept(console, 'log', queue('out'));
    var stopErr = cept(console, 'error', queue('err'));

    /**
     * Stops intercepting. Returns the captured `std`.
     *
     * @return {Object} - Output.
     */
    return function () {
        var current = {
            'out': std.out.join('\n').trim(),
            'err': std.err.join('\n').trim()
        };

        stopOut();
        stopErr();

        std.out = [];
        std.err = [];

        return current;
    };
}

/*
 * Tests.
 */

describe('mdast-validate-links', function () {
    beforeEach(function () {
        process.chdir('./test/fixtures');
    });

    afterEach(function () {
        process.chdir('../..');
    });

    it('should throw an error when not on the CLI', function () {
        assert.throws(function () {
            mdast().use(links);
        }, /Error: mdast-validate-links only works on the CLI/);
    });

    it('should warn when used without slugs', function (done) {
        var stop = intercept();

        cli({
            'files': 'example.md',
            'color': false,
            'detectRC': false,
            'detectIgnore': false,
            'plugins': [
                '../../../index.js'
            ]
        }, function (err) {
            var res = stop();

            equal(res.err.split('\n').slice(0, 2).join('\n'), [
                'example.md',
                '        1:1  error    Error: Missing slugs. Use for ' +
                    'example `mdast-slug` to generate heading IDs'
            ].join('\n'));

            done(err);
        });
    });

    it('should ignore unfound files', function (done) {
        var stop = intercept();

        cli({
            'files': ['definitions.md', 'FOOOO'],
            'color': false,
            'detectRC': false,
            'detectIgnore': false,
            'plugins': [
                '../../../node_modules/mdast-slug',
                '../../../index.js'
            ]
        }, function (err) {
            var res = stop();

            equal(res.out, '');

            equal(res.err, [
                'definitions.md',
                '  5:12-5:21  warning  Link to unknown heading: `world`',
                '',
                'FOOOO',
                '        1:1  error    No such file or directory',
                '',
                '2 messages (✖ 1 error, ⚠ 1 warning)'
            ].join('\n'));

            done(err);
        });
    });

    it('should work when not all files are given', function (done) {
        var stop = intercept();

        cli({
            'files': 'example.md',
            'color': false,
            'detectRC': false,
            'detectIgnore': false,
            'plugins': [
                '../../../node_modules/mdast-slug',
                '../../../index.js'
            ]
        }, function (err) {
            var res = stop();

            equal(res.err, [
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
                '⚠ 9 warnings'
            ].join('\n'));

            done(err);
        });
    });

    it('should work when all files are given', function (done) {
        var stop = intercept();

        cli({
            'files': [
                'example.md',
                'examples/example.md'
            ],
            'color': false,
            'detectRC': false,
            'detectIgnore': false,
                'plugins': [
                    '../../../node_modules/mdast-slug',
                    '../../../index.js'
                ]
        }, function (err) {
            var res = stop();

            equal(res.out, '');

            equal(res.err, [
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
                '⚠ 14 warnings'
            ].join('\n'));

            done(err);
        });
    });

    it('should work with definitions', function (done) {
        var stop = intercept();

        cli({
            'files': 'definitions.md',
            'color': false,
            'detectRC': false,
            'detectIgnore': false,
                'plugins': [
                    '../../../node_modules/mdast-slug',
                    '../../../index.js'
                ]
        }, function (err) {
            var res = stop();

            equal(res.err, [
                'definitions.md',
                '  5:12-5:21  warning  Link to unknown heading: `world`',
                '',
                '⚠ 1 warning'
            ].join('\n'));

            done(err);
        });
    });

    it('should work on GitHub URLs when given a repo', function (done) {
        var stop = intercept();

        cli({
            'files': [
                'example.md',
                'examples/example.md'
            ],
            'color': false,
            'detectRC': false,
            'detectIgnore': false,
            'plugins': {
                '../../../node_modules/mdast-slug': null,
                '../../../index.js': {
                    'repository': 'wooorm/test'
                }
            }
        }, function (err) {
            var res = stop();

            equal(res.out, '');

            equal(res.err, [
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
            ].join('\n'));

            done(err);
        });
    });

    it('should work on GitHub URLs when with package.json', function (done) {
        var stop = intercept();

        fs.writeFileSync('./package.json', JSON.stringify({
            'repository': 'wooorm/test'
        }, 0, 2));

        cli({
            'files': [
                'example.md',
                'examples/example.md'
            ],
            'color': false,
            'detectRC': false,
            'detectIgnore': false,
                'plugins': [
                    '../../../node_modules/mdast-slug',
                    '../../../index.js'
                ]
        }, function (err) {
            var res = stop();

            fs.unlinkSync('./package.json');

            equal(res.err, [
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
            ].join('\n'));

            done(err);
        });
    });

    it('should suggest similar links', function (done) {
        var stop = intercept();

        cli({
            'files': ['suggestions.md'],
            'color': false,
            'detectRC': false,
            'detectIgnore': false,
            'plugins': [
                '../../../node_modules/mdast-slug',
                '../../../index.js'
            ]
        }, function (err) {
            var res = stop();

            equal(res.err, [
                'suggestions.md',
                '  3:22-3:37  warning  Link to unknown heading: `helloo`. ' +
                    'Did you mean `hello`',
                '  7:17-7:40  warning  Link to unknown heading in ' +
                    '`example.md`: `fiiiles`. Did you mean `files`',
                '',
                '⚠ 2 warnings'
            ].join('\n'));

            done(err);
        });
    });
});
