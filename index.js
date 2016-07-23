/**
 * @author Titus Wormer
 * @copyright 2015 Titus Wormer
 * @license MIT
 * @module remark:validate-links
 * @fileoverview Validate links to headings and files in markdown.
 */

'use strict';

/* eslint-env node */

/* Dependencies. */
var url = require('url');
var fs = require('fs');
var path = require('path');
var propose = require('propose');
var visit = require('unist-util-visit');
var definitions = require('mdast-util-definitions');
var gh = require('github-url-to-object');
var urljoin = require('urljoin');
var slug = require('remark-slug');
var xtend = require('xtend');

/* Expose. */
module.exports = attacher;

/* Methods. */
var exists = fs.existsSync;
var parse = url.parse;

/* Constants. */
var NS = 'remark-validate-links';

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
 * Suggest a possible similar reference.
 *
 * @param {string} pathname - Unfound reference.
 * @param {Object<string, boolean>} references - All
 *   references.
 * @return {string?} - Suggested reference.
 */
function getClosest(pathname, references) {
  var hash = getHash(pathname);
  var base = getPathname(pathname);
  var dictionary = [];
  var reference;
  var subhash;
  var subbase;

  for (reference in references) {
    subbase = getPathname(reference);
    subhash = getHash(reference);

    if (getPathname(reference) === base) {
      if (subhash && hash) {
        dictionary.push(subhash);
      }
    } else if (!subhash && !hash) {
      dictionary.push(subbase);
    }
  }

  return propose(hash ? hash : base, dictionary, {threshold: 0.7});
}

/**
 * Utilitity to warn `warning` for each node in `nodes`,
 * on `file`.
 *
 * @param {File} file - Virtual file.
 * @param {Array.<Node>} nodes - Offending nodes.
 * @param {string} message - Message.
 */
function warnAll(file, nodes, message) {
  nodes.forEach(function (node) {
    var warning = file.warn(message, node);
    warning.source = 'remark-validate-links';
  });
}

/**
 * Gather references: a map of file-paths references
 * to be one or more nodes.
 *
 * @param {File} file - Set of virtual files.
 * @param {Node} tree - Syntax tree.
 * @param {Object.<string, string>} project - GitHub
 *   project, with a `user` and `repo` property
 *   (optional).
 * @return {Object.<string, Array.<Node>>} exposed - Map of
 *   file-paths (and anchors) which are referenced.
 */
function gatherReferences(file, tree, project) {
  var cache = {};
  var filePath = file.filePath();
  var directory = file.directory;
  var getDefinition;
  var prefix = '';

  getDefinition = definitions(tree);

  if (project.user && project.repo) {
    prefix = '/' + project.user + '/' + project.repo + '/blob/';
  }

  /**
   * Handle new links.
   */
  function onlink(node) {
    var link = node.url;
    var definition;
    var index;
    var uri;
    var pathname;
    var hash;

    /* Handle link-references. */
    if (node.identifier) {
      definition = getDefinition(node.identifier);
      link = definition && definition.url;
    }

    /* Ignore definitions without link. */
    if (!link) {
      return;
    }

    uri = parse(link);

    if (!uri.hostname) {
      /* Handle hashes, or relative files. */
      if (!uri.pathname && uri.hash) {
        link = filePath + uri.hash;
        uri = parse(link);
      } else {
        link = urljoin(directory || './', link);
        if (uri.hash) {
          link += uri.hash;
        }
        uri = parse(link);
      }
    }

    /* Handle full links.
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

      /* Things get interesting here: branches.
       * `foo/bar/baz` could be `baz` on the
       * `foo/bar` branch. Or, `baz` in the `bar`
       * directory on the `foo` branch.
       *
       * Currently, I’m ignoring this and just not
       * supporting branches. */
      link = link.slice(link.indexOf('/') + 1);

      uri = parse(link);
    }

    /* Handle file links, or combinations of files
     * and hashes. */
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

  visit(tree, 'link', onlink);
  visit(tree, 'linkReference', onlink);

  return cache;
}

/**
 * Check if `file` references headings or files not in
 * `exposed`. If `project` is given, normalizes GitHub blob
 * URLs.
 *
 * @param {Object.<string, boolean?>} exposed - Map of
 *   file-paths (and anchors) which can be references to.
 * @param {File} file - Set of virtual files.
 */
function validate(exposed, file) {
  var references = file.namespace(NS).references;
  var filePath = file.filePath();
  var reference;
  var nodes;
  var real;
  var hash;
  var pathname;
  var warning;
  var suggestion;

  for (reference in references) {
    nodes = references[reference];
    real = exposed[reference];
    hash = getHash(reference);

    /* Check if files without `hash` can be linked to.
     * Because there’s no need to inspect those files
     * for headings they are not added to remark. This
     * is especially useful because they might be
     * non-markdown files. Here we check if they exist. */
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

      suggestion = getClosest(reference, exposed);

      if (suggestion) {
        warning += '. Did you mean `' + suggestion + '`';
      }

      warnAll(file, nodes, warning);
    }
  }
}

/**
 * Completer.
 *
 * @property {*} pluginId - Unique ID so completers by
 *   this plug-in are not added multiple times to a single
 *   file-set pipeline.
 * @param {FileSet} set - Virtual file-set.
 * @param {function(err?)} done - Callback.
 */
function completer(set, done) {
  var exposed = {};

  set.valueOf().forEach(function (file) {
    var landmarks = file.namespace(NS).landmarks;

    if (landmarks) {
      exposed = xtend(exposed, landmarks);
    }
  });

  set.valueOf().forEach(function (file) {
    /* istanbul ignore else - stdin */
    if (file.filePath()) {
      validate(exposed, file);
    }
  });

  done();
}

completer.pluginId = 'remark-validate-links';

/**
* Factory to create a transformer based on the given
* project and set.
*
* @param {Object.<string, string>} project - GitHub
*   project, with a `user` and `repo` property
*   (optional).
* @param {FileSet} fileSet - Set of virtual files.
* @return {function(ast, file)} - Transformer.
*/
function transformerFactory(project, fileSet) {
  /**
   * Transformer. Adds references files to the set.
   *
   * @param {*} ast - Node.
   * @param {File} file - Virtual file.
   */
  function transformer(ast, file) {
    var filePath = file.filePath();
    var space = file.namespace(NS);
    var links = [];
    var landmarks = {};
    var references;
    var current;
    var link;
    var pathname;

    /* istanbul ignore if - stdin */
    if (!filePath) {
      return;
    }

    references = gatherReferences(file, ast, project);
    current = getPathname(filePath);

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

    landmarks[filePath] = true;

    visit(ast, function (node) {
      var data = node.data || {};
      var attrs = data.htmlAttributes || {};
      var id = attrs.name || attrs.id || data.id;

      if (id) {
        landmarks[filePath + '#' + id] = true;
      }
    });

    space.references = references;
    space.landmarks = landmarks;
  }

  return transformer;
}

/**
* Attacher.
*
* @param {Remark} remark - Processor.
* @param {Object?} options - Settings.
* @param {FileSet?} fileSet - Virtual file-set.
* @throws {Error} - When `fileSet` is not given (when not on
*   the CLI).
*/
function attacher(remark, options, fileSet) {
  var repo = (options || {}).repository;
  var pack;

  /* Throw when not on the CLI. */
  if (!fileSet) {
    throw new Error('remark-validate-links only works on the CLI');
  }

  /* Try to get the repo from `package.json` when not
   * given. */
  if (!repo) {
    try {
      pack = require(path.resolve(process.cwd(), 'package.json'));
    } catch (err) {
      pack = {};
    }

    repo = pack.repository ? pack.repository.url || pack.repository : '';
  }

  repo = repo ? gh(repo) : {};

  /* Attach a `completer`. */
  fileSet.use(completer);

  /* Attach `slug`. */
  remark.use(slug);

  /* Expose transformer. */
  return transformerFactory({user: repo.user, repo: repo.repo}, fileSet);
}
