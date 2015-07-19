'use strict';

/*
 * Dependencies.
 */

var url = require('url');
var fs = require('fs');
var path = require('path');
var visit = require('mdast-util-visit');
var definitions = require('mdast-util-definitions');
var gh = require('github-url-to-object');
var urljoin = require('urljoin');

/*
 * Methods.
 */

var exists = fs.existsSync;
var parse = url.parse;

/**
 * Get the `pathname` of `uri`, if applicable.
 *
 * @todo Externalise.
 * @param {string} uri - Reference.
 * @return {string?} - Pathname.
 */
function getPathname(uri) {
    return parse(uri).pathname;
}

/**
 * Get the `hash` of `uri`, if applicable.
 *
 * @todo Externalise.
 * @param {string} uri - Reference.
 * @return {string?} - Hash.
 */
function getHash(uri) {
    var hash = parse(uri).hash;

    return hash ? hash.slice(1) : null;
}

/**
 * Utilitity to warn `warning` for each node in `nodes`,
 * on `file`.
 *
 * @param {File} file - Virtual file.
 * @param {Array.<Node>} nodes - Offending nodes.
 * @param {string} warning - Message.
 */
function warnAll(file, nodes, warning) {
    nodes.forEach(function (node) {
        file.warn(warning, node);
    });
}

/**
 * Gather references: a map of file-paths references
 * to be one or more nodes.
 *
 * @example
 *   gatherReferences(new File(), {});
 *
 * @param {File} file - Set of virtual files.
 * @param {Object.<string, string>} project - GitHub
 *   project, with a `user` and `repo` property
 *   (optional).
 * @return {Object.<string, Array.<Node>>} exposed - Map of
 *   file-paths (and anchors) which are referenced.
 */
function gatherReferences(file, project) {
    var cache = {};
    var filePath = file.filePath();
    var directory = file.directory;
    var ast = file.ast;
    var getDefinition = definitions(ast);
    var prefix = '';

    if (project.user && project.repo) {
        prefix = '/' + project.user + '/' + project.repo + '/blob/';
    }

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
        var uri;
        var pathname;
        var hash;

        /*
         * Handle link-references.
         */

        if (node.identifier) {
            definition = getDefinition(node.identifier);
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

        if (!cache[pathname]) {
            cache[pathname] = [];
        }

        cache[pathname].push(node);

        if (hash) {
            if (!cache[link]) {
                cache[link] = [];
            }

            cache[link].push(node);
        }
    }

    visit(ast, 'link', onlink);
    visit(ast, 'linkReference', onlink);

    return cache;
}

/**
 * Factory to store all markdown files, and headings.
 *
 * @example
 *   var gather = gatherExposedFactory();
 *   var file = new File('# foo');
 *
 *   gather(file).done() // {}
 *
 * @return {Function}
 */
function gatherExposedFactory() {
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

        /*
         * Ignore files without AST or filename.
         */

        if (filePath && file.ast) {
            cache[filePath] = true;

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
 * Check if `file` references headings or files not in
 * `exposed`. If `project` is given, normalizes GitHub blob
 * URLs.
 *
 * @example
 *   validate({'example.md': true}, new File());
 *
 * @param {Object.<string, boolean?>} exposed - Map of
 *   file-paths (and anchors) which can be references to.
 * @param {File} file - Set of virtual files.
 * @param {Object.<string, string>} project - GitHub
 *   project, with a `user` and `repo` property
 *   (optional).
 */
function validate(exposed, file, project) {
    var references = file.ast ? gatherReferences(file, project) : {};
    var filePath = file.filePath();
    var reference;
    var nodes;
    var real;
    var hash;
    var pathname;
    var warning;

    for (reference in references) {
        nodes = references[reference];
        real = exposed[reference];
        hash = getHash(reference);

        /*
         * Check if files without `hash` can be linked to.
         * Because there’s no need to inspect those files
         * for headings they are not added to mdast. This
         * is especially useful because they might be
         * non-markdown files. Here we check if they exist.
         */

        if ((real === undefined || real === null) && !hash) {
            real = references[reference] = exists(reference);
        }

        if (!real) {
            if (hash) {
                pathname = getPathname(reference);
                warning = 'Link to unknown heading';

                if (pathname !== filePath) {
                    warning += ' in `' + pathname + '`';
                }

                warning += ': `' + hash + '`';
            } else {
                warning = 'Link to unknown file: `' + reference + '`';
            }

            warnAll(file, nodes, warning);
        }
    }
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
        var gatherExposed = gatherExposedFactory();
        var exposed;

        set.valueOf().forEach(gatherExposed);

        exposed = gatherExposed.done();

        set.valueOf().forEach(function (file) {
            validate(exposed, file, project);
        });

        done();
    }

    completer.pluginId = 'mdast-validate-links';

    return completer;
}

/**
 * Factory to create a transformer based on the given
 * project and set.
 *
 * @example
 *   transformerFactory({}, new FileSet());
 *
 * @param {Object.<string, string>} project - GitHub
 *   project, with a `user` and `repo` property
 *   (optional).
 * @param {FileSet} fileSet - Set of virtual files.
 * @return {function(ast, file)}
 */
function transformerFactory(project, fileSet) {
    /**
     * Transformer. Adds references files to the set.
     *
     * @example
     *   transformer({}, new File());
     *
     * @param {*} ast - Node.
     * @param {File} file - Virtual file.
     */
    function transformer(ast, file) {
        var references = gatherReferences(file, project);
        var links = [];
        var current = getPathname(file.filePath());
        var link;
        var pathname;

        for (link in references) {
            pathname = getPathname(link);

            if (
                pathname !== current &&
                getHash(link) &&
                links.indexOf(pathname) === -1
            ) {
                links.push(pathname);

                fileSet.add(pathname);
            }
        }
    }

    return transformer;
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
 * @param {FileSet?} fileSet - Virtual file-set.
 * @throws {Error} - When `fileSet` is not given (when not on
 *   the CLI).
 */
function attacher(mdast, options, fileSet) {
    var repo = (options || {}).repository;
    var pack;

    /*
     * Throw when not on the CLI.
     */

    if (!fileSet) {
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

    repo = {
        'user': repo.user,
        'repo': repo.repo
    };

    /*
     * Attach a `completer`.
     */

    fileSet.use(completerFactory(repo));

    return transformerFactory(repo, fileSet);
}

/*
 * Expose.
 */

module.exports = attacher;
