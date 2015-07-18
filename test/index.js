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
 * Cache to store output and errors by mdast.
 */

var std = {
    'out': '',
    'err': ''
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
        std[type] += [].slice.call(arguments).join('');
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
            'out': std.out.trim(),
            'err': std.err.trim()
        };

        stopOut();
        stopErr();

        std.out = '';
        std.err = '';

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
            'plugins': ['./index.js']
        }, function (err) {
            var res = stop();

            assert.equal(res.out, '');

            assert.equal(res.err, [
                'example.md',
                '  0:0  error  Missing slugs. Use for example ' +
                    '`mdast-slug` to generate heading IDs',
                '',
                '✖ 1 problem (1 error, 0 warnings)'
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
            'plugins': ['slug', './index.js']
        }, function (err) {
            var res = stop();

            assert.equal(res.out, '');

            assert.equal(res.err, [
                'definitions.md',
                '  5:12  warning  Link to unknown heading: `world`',
                '',
                '✖ 1 problem (0 errors, 1 warning)',
                '',
                'FOOOO',
                '  0:0  error  No such file or directory',
                '',
                '✖ 1 problem (1 error, 0 warnings)'
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
            'plugins': ['slug', './index.js']
        }, function (err) {
            var res = stop();

            assert.equal(res.err, [
                'example.md',
                '   5:37  warning  Link to unknown heading: `world`',
                '  21:10  warning  Link to unknown file: `examples/world.md`',
                '  23:10  warning  Link to unknown file: `examples/world.md`',
                '  27:8   warning  Link to unknown file: ' +
                    '`examples/example.md`',
                '  29:8   warning  Link to unknown file: ' +
                    '`examples/example.md`',
                '  35:10  warning  Link to unknown file: ' +
                    '`examples/example.md`',
                '  37:10  warning  Link to unknown file: ' +
                    '`examples/example.md`',
                '  43:10  warning  Link to unknown file: `examples/world.md`',
                '  45:10  warning  Link to unknown file: `examples/world.md`',
                '',
                '✖ 9 problems (0 errors, 9 warnings)'
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
            'plugins': ['slug', './index.js']
        }, function (err) {
            var res = stop();

            assert.equal(res.out, '');

            assert.equal(res.err, [
                'example.md',
                '   5:37  warning  Link to unknown heading: `world`',
                '  21:10  warning  Link to unknown file: `examples/world.md`',
                '  23:10  warning  Link to unknown file: `examples/world.md`',
                '  35:10  warning  Link to unknown heading in ' +
                    '`examples/example.md`: `world`',
                '  37:10  warning  Link to unknown heading in ' +
                    '`examples/example.md`: `world`',
                '  43:10  warning  Link to unknown file: `examples/world.md`',
                '  45:10  warning  Link to unknown file: `examples/world.md`',
                '',
                '✖ 7 problems (0 errors, 7 warnings)',
                '',
                'examples/example.md',
                '   5:37  warning  Link to unknown heading: `world`',
                '  19:10  warning  Link to unknown file: `world.md`',
                '  29:10  warning  Link to unknown heading in ' +
                    '`example.md`: `world`',
                '  35:10  warning  Link to unknown file: `world.md`',
                '',
                '✖ 4 problems (0 errors, 4 warnings)'
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
            'plugins': ['slug', './index.js']
        }, function (err) {
            var res = stop();

            assert.equal(res.err, [
                'definitions.md',
                '  5:12  warning  Link to unknown heading: `world`',
                '',
                '✖ 1 problem (0 errors, 1 warning)'
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
                'slug': null,
                './index.js': {
                    'repository': 'wooorm/test'
                }
            }
        }, function (err) {
            var res = stop();

            assert.equal(res.out, '');

            assert.equal(res.err, [
                'example.md',
                '   5:37  warning  Link to unknown heading: `world`',
                '  17:34  warning  Link to unknown file: `examples/world.md`',
                '  19:12  warning  Link to unknown file: `examples/world.md`',
                '  21:10  warning  Link to unknown file: `examples/world.md`',
                '  23:10  warning  Link to unknown file: `examples/world.md`',
                '  35:10  warning  Link to unknown heading in ' +
                    '`examples/example.md`: `world`',
                '  37:10  warning  Link to unknown heading in ' +
                    '`examples/example.md`: `world`',
                '  39:10  warning  Link to unknown heading in ' +
                    '`examples/example.md`: `world`',
                '  41:10  warning  Link to unknown heading in ' +
                    '`examples/example.md`: `world`',
                '  43:10  warning  Link to unknown file: `examples/world.md`',
                '  45:10  warning  Link to unknown file: `examples/world.md`',
                '  47:10  warning  Link to unknown file: `examples/world.md`',
                '  49:10  warning  Link to unknown file: `examples/world.md`',
                '',
                '✖ 13 problems (0 errors, 13 warnings)',
                '',
                'examples/example.md',
                '   5:37  warning  Link to unknown heading: `world`',
                '  15:34  warning  Link to unknown file: `world.md`',
                '  17:12  warning  Link to unknown file: `world.md`',
                '  19:10  warning  Link to unknown file: `world.md`',
                '  29:10  warning  Link to unknown heading in ' +
                    '`example.md`: `world`',
                '  31:10  warning  Link to unknown heading in ' +
                    '`example.md`: `world`',
                '  33:10  warning  Link to unknown heading in ' +
                    '`example.md`: `world`',
                '  35:10  warning  Link to unknown file: `world.md`',
                '  37:10  warning  Link to unknown file: `world.md`',
                '  39:10  warning  Link to unknown file: `world.md`',
                '',
                '✖ 10 problems (0 errors, 10 warnings)'
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

            assert.equal(res.out, '');

            assert.equal(res.err, [
                'example.md',
                '   5:37  warning  Link to unknown heading: `world`',
                '  17:34  warning  Link to unknown file: `examples/world.md`',
                '  19:12  warning  Link to unknown file: `examples/world.md`',
                '  21:10  warning  Link to unknown file: `examples/world.md`',
                '  23:10  warning  Link to unknown file: `examples/world.md`',
                '  35:10  warning  Link to unknown heading in ' +
                    '`examples/example.md`: `world`',
                '  37:10  warning  Link to unknown heading in ' +
                    '`examples/example.md`: `world`',
                '  39:10  warning  Link to unknown heading in ' +
                    '`examples/example.md`: `world`',
                '  41:10  warning  Link to unknown heading in ' +
                    '`examples/example.md`: `world`',
                '  43:10  warning  Link to unknown file: `examples/world.md`',
                '  45:10  warning  Link to unknown file: `examples/world.md`',
                '  47:10  warning  Link to unknown file: `examples/world.md`',
                '  49:10  warning  Link to unknown file: `examples/world.md`',
                '',
                '✖ 13 problems (0 errors, 13 warnings)',
                '',
                'examples/example.md',
                '   5:37  warning  Link to unknown heading: `world`',
                '  15:34  warning  Link to unknown file: `world.md`',
                '  17:12  warning  Link to unknown file: `world.md`',
                '  19:10  warning  Link to unknown file: `world.md`',
                '  29:10  warning  Link to unknown heading in ' +
                    '`example.md`: `world`',
                '  31:10  warning  Link to unknown heading in ' +
                    '`example.md`: `world`',
                '  33:10  warning  Link to unknown heading in ' +
                    '`example.md`: `world`',
                '  35:10  warning  Link to unknown file: `world.md`',
                '  37:10  warning  Link to unknown file: `world.md`',
                '  39:10  warning  Link to unknown file: `world.md`',
                '',
                '✖ 10 problems (0 errors, 10 warnings)'
            ].join('\n'));

            done(err);
        });
    });
});
