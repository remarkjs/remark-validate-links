'use strict';

var url = require('url');
var propose = require('propose');
var visit = require('unist-util-visit');
var definitions = require('mdast-util-definitions');
var hostedGitInfo = require('hosted-git-info');
var urljoin = require('urljoin');
var slug = require('remark-slug');
var xtend = require('xtend/mutable.js');

/* Optional Node dependencies. */
var fs;
var path;

try {
  fs = require('fs');
  path = require('path');
} catch (err) {}

module.exports = attacher;

var referenceId = 'remarkValidateLinksReferences';
var landmarkId = 'remarkValidateLinksLandmarks';
var sourceId = 'remark-validate-links';
var headingRuleId = 'missing-heading';
var headingInFileRuleId = 'missing-heading-in-file';
var fileRuleId = 'missing-file';

cliCompleter.pluginId = sourceId;

var parse = url.parse;

var viewPaths = {
  github: 'blob',
  gitlab: 'blob',
  bitbucket: 'src'
};

var headingPrefixes = {
  github: '#',
  gitlab: '#',
  bitbucket: '#markdown-header-'
};

function attacher(options, fileSet) {
  var repo = (options || {}).repository;
  var info;
  var pack;

  /* Try to get the repo from `package.json` when not
   * given. */
  if (!repo && fs && fileSet) {
    try {
      pack = fileSet.files[0].cwd;
      pack = JSON.parse(fs.readFileSync(path.resolve(pack, 'package.json')));
    } catch (err) {
      pack = {};
    }

    repo = pack.repository ? pack.repository.url || pack.repository : '';
  }

  if (repo) {
    info = hostedGitInfo.fromUrl(repo);

    if (!info) {
      throw new Error('remark-validate-links cannot parse `repository` (`' + repo + '`)');
    } else if (info.domain === 'gist.github.com') {
      throw new Error('remark-validate-links does not support gist repositories');
    }
  }

  /* Attach `slug` and a plugin that adds our transformer after it. */
  this.use(slug).use(subplugin);

  /* Attach a `completer`. */
  if (fileSet) {
    fileSet.use(cliCompleter);
  } else {
    this.use(apiCompleter);
  }

  function subplugin() {
    /* Expose transformer. */
    return transformerFactory(fileSet, info);
  }
}

/* Completer for the API (one file, only headings are checked). */
function apiCompleter() {
  return transformer;
  function transformer(tree, file) {
    checkFactory(file.data[landmarkId])(file);
  }
}

/* Completer for the CLI (multiple files, and support to add more). */
function cliCompleter(set, done) {
  var exposed = {};
  var check = checkFactory(exposed);

  set.valueOf().forEach(expose);
  set.valueOf().forEach(check);

  done();

  function expose(file) {
    var landmarks = file.data[landmarkId];

    if (landmarks) {
      xtend(exposed, landmarks);
    }
  }
}

function checkFactory(exposed) {
  return check;
  function check(file) {
    /* istanbul ignore else - stdin */
    if (file.path) {
      validate(exposed, file);
    }
  }
}

/* Factory to create a transformer based on the given
 * info and set. */
function transformerFactory(fileSet, info) {
  return transformer;

  /* Transformer. Adds references files to the set. */
  function transformer(ast, file) {
    var filePath = file.path;
    var space = file.data;
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

    references = gatherReferences(file, ast, info, fileSet);
    current = getPathname(filePath);

    for (link in references) {
      pathname = getPathname(link);

      if (
        fileSet &&
        pathname !== current &&
        getHash(link) &&
        links.indexOf(pathname) === -1
      ) {
        links.push(pathname);
        fileSet.add(pathname);
      }
    }

    landmarks[filePath] = true;

    visit(ast, mark);

    space[referenceId] = references;
    space[landmarkId] = landmarks;

    function mark(node) {
      var data = node.data || {};
      var attrs = data.hProperties || data.htmlAttributes || {};
      var id = attrs.name || attrs.id || data.id;

      if (id) {
        landmarks[filePath + '#' + id] = true;
      }
    }
  }
}

/* Check if `file` references headings or files not in `exposed`. */
function validate(exposed, file) {
  var references = file.data[referenceId];
  var filePath = file.path;
  var reference;
  var nodes;
  var real;
  var hash;
  var pathname;
  var warning;
  var suggestion;
  var ruleId;

  for (reference in references) {
    nodes = references[reference];
    real = exposed[reference];
    hash = getHash(reference);

    /* Check if files without `hash` can be linked to.
     * Because there’s no need to inspect those files
     * for headings they are not added to remark. This
     * is especially useful because they might be
     * non-markdown files. Here we check if they exist. */
    if ((real === undefined || real === null) && !hash && fs) {
      real = fs.existsSync(reference);
      references[reference] = real;
    }

    if (!real) {
      if (hash) {
        pathname = getPathname(reference);
        warning = 'Link to unknown heading';
        ruleId = headingRuleId;

        if (pathname !== filePath) {
          if (new RegExp('L\\d+', 'i').test(hash)) {
            continue;
          }
          warning += ' in `' + pathname + '`';
          ruleId = headingInFileRuleId;
        }

        warning += ': `' + hash + '`';
      } else {
        warning = 'Link to unknown file: `' + reference + '`';
        ruleId = fileRuleId;
      }

      suggestion = getClosest(reference, exposed);

      if (suggestion) {
        warning += '. Did you mean `' + suggestion + '`';
      }

      warnAll(file, nodes, warning, ruleId);
    }
  }
}

/* Gather references: a map of file-paths references
 * to be one or more nodes. */
function gatherReferences(file, tree, info, fileSet) {
  var cache = {};
  var getDefinition = definitions(tree);
  var prefix = '';
  var headingPrefix = '#';

  if (info && info.type in viewPaths) {
    prefix = '/' + info.path() + '/' + viewPaths[info.type] + '/';
  }

  if (info && info.type in headingPrefixes) {
    headingPrefix = headingPrefixes[info.type];
  }

  visit(tree, 'link', onlink);
  visit(tree, 'linkReference', onlink);

  return cache;

  /* Handle new links. */
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

    if (!fileSet && (uri.hostname || uri.pathname)) {
      return;
    }

    if (!uri.hostname) {
      /* Handle hashes, or relative files. */
      if (!uri.pathname && uri.hash) {
        link = file.path + uri.hash;
        uri = parse(link);
      } else {
        link = urljoin(file.dirname, link);

        if (uri.hash) {
          link += uri.hash;
        }
        uri = parse(link);
      }
    }

    /* Handle full links. */
    if (uri.hostname) {
      if (!prefix || !fileSet) {
        return;
      }

      if (uri.hostname !== info.domain || uri.pathname.slice(0, prefix.length) !== prefix) {
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
    }

    /* Handle file links, or combinations of files
     * and hashes. */
    index = link.indexOf(headingPrefix);

    if (index === -1) {
      pathname = link;
      hash = null;
    } else {
      pathname = link.slice(0, index);
      hash = link.slice(index + headingPrefix.length);
    }

    if (!cache[pathname]) {
      cache[pathname] = [];
    }

    cache[pathname].push(node);

    if (hash) {
      link = pathname + '#' + hash;

      if (!cache[link]) {
        cache[link] = [];
      }

      cache[link].push(node);
    }
  }
}

/* Utility to warn `reason` for each node in `nodes`,
 * on `file`. */
function warnAll(file, nodes, reason, ruleId) {
  nodes.forEach(function (node) {
    var message = file.message(reason, node);
    message.source = sourceId;
    message.ruleId = ruleId;
  });
}

/* Suggest a possible similar reference. */
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

/* Get the `hash` of `uri`, if applicable. */
function getHash(uri) {
  var hash = parse(uri).hash;

  return hash ? hash.slice(1) : null;
}

/* Get the `pathname` of `uri`, if applicable. */
function getPathname(uri) {
  return parse(uri).pathname;
}
