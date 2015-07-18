'use strict';

/*
 * Dependencies.
 */

var url = require('url');
var fs = require('fs');
var path = require('path');
var visit = require('mdast-util-visit');
var gh = require('github-url-to-object');
var urljoin = require('urljoin');

/*
 * Methods.
 */

var exists = fs.existsSync;
var parse = url.parse;

/**
 * Factory to store all markdown files, and headings.
 *
 * @example
 *   var gather = gatherFactory();
 *   var file = new File('# foo');
 *
 *   gather(file).done() // {}
 *
 * @return {Function}
 */
function gatherFactory() {
    var cache = {};
    var hasHeadings = false;
    var hasSlugs = false;

    /**
     * Access found files and headings.
     *
     * @return {Object.<string, boolean>} - Map of
     *   file-paths, with `true` as their value.
     * @throws {Error} - When headings are found, but no
     *   heading has a slug.
     */
    function done() {
        if (hasHeadings && !hasSlugs) {
            throw new Error(
                'Missing slugs. Use for example `mdast-slug` to generate ' +
                'heading IDs'
            );
        }

        return cache;
    }

    /**
     * Find headings in `file`.
     *
     * @property {Function} done - Access found links.
     * @param {File} file - Virtual file.
     * @returns {Function} - Itself.
     */
    function gather(file) {
        var filePath = file.filePath();

        cache[filePath] = true;

        /*
         * Ignore files without AST or filename.
         */

        if (filePath && file.ast) {
            visit(file.ast, 'heading', function (node) {
                var id = node.attributes && node.attributes.id;

                hasHeadings = true;

                if (id) {
                    cache[filePath + '#' + id] = hasSlugs = true;
                }
            });
        }

        return gather;
    }

    gather.done = done;

    return gather;
}

/**
 * Resolve a single `file`.
 *
 * @example
 *   var file = new File('[](foo.md)')
 *
 *   resolve(file, {
 *     'foo.md': true
 *   }, {});
 *   // no warnings.
 *
 * @param {File} file - Virtual file.
 * @param {Object} cache - Found links.
 * @param {Object} project - GitHub project, if applicable.
 */
function resolve(file, cache, project) {
    var filePath = file.filePath();
    var directory = file.directory;
    var ast = file.ast;
    var definitions = {};
    var prefix = '';

    if (project.user && project.repo) {
        prefix = '/' + project.user + '/' + project.repo + '/blob/';
    }

    /*
     * Store link definitions.
     */

    visit(ast, 'definition', function (node) {
        definitions[node.identifier.toUpperCase()] = node;
    });

    /**
     * Handle new links.
     *
     * @example
     *   link({
     *     href: 'foo/bar/baz.md#foo',
     *     children: [
     *       {
     *         type: 'text',
     *         value: 'foo'
     *       }
     *     ]
     *   });
     *
     * @param {Node} node - Link or link-reference node.
     */
    function onlink(node) {
        var link = node.href;
        var definition;
        var index;
        var pathname;
        var hash;
        var uri;
        var warning;

        /*
         * Handle link-references.
         */

        if (node.identifier) {
            definition = definitions[node.identifier.toUpperCase()];
            link = definition && definition.link;
        }

        /*
         * Ignore definitions without link.
         */

        if (!link) {
            return;
        }

        uri = parse(link);

        if (!uri.hostname) {
            /*
             * Handle hashes, or relative files.
             */
            if (!uri.pathname && uri.hash) {
                link = filePath + uri.hash;
                uri = parse(link);
            } else {
                link = urljoin(directory, link) + (uri.hash || '');
                uri = parse(link);
            }
        }

        /*
         * Handle full links.
         * Only works with GitHub.
         */

        if (uri.hostname) {
            if (!prefix) {
                return;
            }

            if (
                uri.hostname !== 'github.com' ||
                uri.pathname.slice(0, prefix.length) !== prefix
            ) {
                return;
            }

            link = uri.pathname.slice(prefix.length) + (uri.hash || '');

            /*
             * Things get interesting here: branches.
             * `foo/bar/baz` could be `baz` on the
             * `foo/bar` branch. Or, `baz` in the `bar`
             * directory on the `foo` branch.
             *
             * Currently, I’m ignoring this and just not
             * supporting branches.
             */

            link = link.slice(link.indexOf('/') + 1);

            uri = parse(link);
        }

        /*
         * Handle file links, or combinations of files
         * and hashes.
         */

        index = link.indexOf('#');

        if (index === -1) {
            pathname = link;
            hash = null;
        } else {
            pathname = link.slice(0, index);
            hash = link.slice(index + 1);
        }

        if (cache[pathname] !== true) {
            /*
             * Ignore actually existing, but not to mdast
             * visible files (unless the link has a hash).
             */

            if (!exists(pathname) || hash) {
                warning = 'Link to unknown file: `' + pathname + '`';
            }
        } else if (cache[link] !== true) {
            warning = 'Link to unknown heading';

            if (pathname !== filePath) {
                warning += ' in `' + pathname + '`';
            }

            warning += ': `' + hash + '`';
        }

        if (warning) {
            file.warn(warning, node);
        }
    }

    visit(ast, 'link', onlink);
    visit(ast, 'linkReference', onlink);
}

/**
 * Resolve all files in `set`.
 *
 * @example
 *   var set = new FileSet();
 *   set.add(new File('[](foo.md)'));
 *
 *   resolveAll(set, {
 *     'foo.md': true
 *   }, {});
 *   // no warnings.
 *
 * @param {FileSet} set - Virtual file-set.
 * @param {Object} cache - Found links.
 * @param {Object} project - GitHub project, if applicable.
 */
function resolveAll(set, cache, project) {
    set.valueOf().forEach(function (file) {
        /*
         * Ignore failed files.
         */

        if (!file.hasFailed()) {
            resolve(file, cache, project);
        }
    });
}

/**
 * Factory to create a new completer.
 *
 * @example
 *   var completer = completerFactory({
 *     'user': 'foo',
 *     'repo': 'bar'
 *   });
 *
 * @param {Object} project - GitHub project, if applicable.
 * @return {Function} - `completer`, bound to `project`.
 */
function completerFactory(project) {
    /**
     * Completer.
     *
     * @example
     *   completer(new FileSet(), console.log)
     *
     * @property {*} pluginId - Unique ID so completers by
     *   this plug-in are not added multiple times to a single
     *   file-set pipeline.
     * @param {FileSet} set - Virtual file-set.
     * @param {function(err?)} done - Callback.
     */
    function completer(set, done) {
        var gather = gatherFactory();

        set.valueOf().forEach(gather);

        resolveAll(set, gather.done(), project);

        done();
    }

    completer.pluginId = 'mdast-validate-links';

    return completer;
}

/**
 * Attacher.
 *
 * @example
 *   attacher(mdast())
 *   // [Error: mdast-validate-links only works on the CLI]
 *
 * @param {MDAST} mdast - Processor.
 * @param {Object?} options - Settings.
 * @param {FileSet?} set - Virtual file-set.
 * @throws {Error} - When `set` is not given (when not on
 *   the CLI).
 */
function attacher(mdast, options, set) {
    var repo = (options || {}).repository;
    var pack;

    /*
     * Throw when not on the CLI.
     */

    if (!set) {
        throw new Error('mdast-validate-links only works on the CLI');
    }

    /*
     * Try to get the repo from `package.json` when not
     * given.
     */

    if (!repo) {
        try {
            pack = require(path.resolve(process.cwd(), 'package.json'));
        } catch (exception) {
            pack = {};
        }

        repo = pack.repository ? pack.repository.url || pack.repository : '';
    }

    repo = repo ? gh(repo) : {};

    /*
     * Attach a `completer`.
     */

    set.use(completerFactory({
        'user': repo.user,
        'repo': repo.repo
    }));
}

/*
 * Expose.
 */

module.exports = attacher;
