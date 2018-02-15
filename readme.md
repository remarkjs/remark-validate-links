# remark-validate-links [![Build Status][build-badge]][build-status] [![Coverage Status][coverage-badge]][coverage-status] [![Chat][chat-badge]][chat]

This tool validates your Markdown internal links. **It will warn you** 
if you have links to headings of files that don't exist. **It will not 
warn you** if you have broken links to external pages.

For example, this document does not have a heading named `Hello`.
So if I link to that (`[welcome](#hello)`), this plug-in will warn
about it.

In addition, when I link to a heading in another document
(`examples/foo.md#hello`), if this file exists but the heading does not,
or if the file does not exist, this plug-in will also warn.

Linking to other files, such as `LICENSE` or `index.js` (when they exist)
is fine.

## Table of Contents

*   [Installation](#installation)
*   [Command line](#command-line)
*   [Programmatic](#programmatic)
*   [Configuration](#configuration)
*   [Integration](#integration)
*   [Related](#related)
*   [Contribute](#contribute)
*   [License](#license)

## Installation

[npm][]:

```bash
npm install remark-validate-links
```

## Command line

Use `remark-validate-links` together with [**remark**][remark]:

```bash
npm install --global remark-cli remark-validate-links
```

Let’s say `readme.md` is this document, and `example.md` looks as follows:

```markdown
# Hello

Read more [whoops, this does not exist](#world).

This doesn’t exist either [whoops!](readme.md#foo).

But this does exist: [LICENSE](LICENSE).

So does this: [README](readme.md#installation).
```

Now, running `remark -u validate-links .` yields:

```text
example.md
  3:11-3:48  warning  Link to unknown heading: `world`               missing-heading          remark-validate-links
  5:27-5:51  warning  Link to unknown heading in `readme.md`: `foo`  missing-heading-in-file  remark-validate-links

readme.md: no issues found

⚠ 2 warnings
```

## Programmatic

> Note: The API only checks links to headings.  Other URLs are not checked.

Say we have the following file, `example.md`:

```markdown
# Alpha

This [exists](#alpha). This [exists][alpha] too.
This [one does not](#does-not).

# Bravo

This is [not checked](readme.md#bravo).

[alpha]: #alpha
```

And our script, `example.js`, looks as follows:

```javascript
var vfile = require('to-vfile');
var report = require('vfile-reporter');
var remark = require('remark');
var links = require('remark-validate-links');

remark()
  .use(links)
  .process(vfile.readSync('example.md'), function (err, file) {
    console.error(report(err || file));
  });
```

Now, running `node example` yields:

```markdown
example.md
  4:6-4:31  warning  Link to unknown heading: `does-not`  remark-validate-links  remark-validate-links

⚠ 1 warning
```

## Configuration

You can pass a `repository`, containing anything `package.json`s
[`repository`][package-repository] can handle.  If this is omitted,
`remark-validate-links` will try the `package.json` in your current working
directory.

```bash
remark --use 'validate-links=repository:"foo/bar"' example.md
```

When a repository is given or detected (supporting GitHub, GitLab, and
Bitbucket), links to the files are normalized to the file-system.
For example, `https://github.com/foo/bar/blob/master/example.md` becomes
`example.md`.

You can define this repository in [configuration files][cli] too.
An example `.remarkrc` file could look as follows:

```json
{
  "plugins": [
    [
      "validate-links",
      {
        "repository": "foo/bar"
      }
    ]
  ]
}
```

## Integration

`remark-validate-links` can detect anchors on nodes through several properties
on nodes:

*   `node.data.hProperties.name` — Used by [`remark-html`][remark-html]
    to create a `name` attribute, which anchors can link to
*   `node.data.hProperties.id` — Used by [`remark-html`][remark-html]
    to create an `id` attribute, which anchors can link to
*   `node.data.id` — Used, in the future, by other tools to signal
    unique identifiers on nodes

## Related

*   [`remark-lint`][remark-lint] — Markdown code style linter

## Contribute

See [`contribute.md` in `remarkjs/remarkj`][contribute] for ways to get started.

This organisation has a [Code of Conduct][coc].  By interacting with this
repository, organisation, or community you agree to abide by its terms.

## License

[MIT][license] © [Titus Wormer][author]

<!-- Definitions -->

[build-badge]: https://img.shields.io/travis/remarkjs/remark-validate-links.svg

[build-status]: https://travis-ci.org/remarkjs/remark-validate-links

[coverage-badge]: https://img.shields.io/codecov/c/github/remarkjs/remark-validate-links.svg

[coverage-status]: https://codecov.io/github/remarkjs/remark-validate-links

[chat-badge]: https://img.shields.io/gitter/room/remarkjs/Lobby.svg

[chat]: https://gitter.im/remarkjs/Lobby

[license]: LICENSE

[author]: http://wooorm.com

[npm]: https://docs.npmjs.com/cli/install

[remark]: https://github.com/remarkjs/remark

[remark-lint]: https://github.com/remarkjs/remark-lint

[remark-html]: https://github.com/remarkjs/remark-html

[package-repository]: https://docs.npmjs.com/files/package.json#repository

[cli]: https://github.com/remarkjs/remark/tree/master/packages/remark-cli#readme

[contribute]: https://github.com/remarkjs/remark/blob/master/contributing.md

[coc]: https://github.com/remarkjs/remark/blob/master/code-of-conduct.md
