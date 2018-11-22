# remark-validate-links

[![Build][build-badge]][build]
[![Coverage][coverage-badge]][coverage]
[![Downloads][downloads-badge]][downloads]
[![Chat][chat-badge]][chat]
[![Sponsors][sponsors-badge]][collective]
[![Backers][backers-badge]][collective]

[**remark**][remark] plugin to validate if internal links to headings and files
in markdown point to existing things.
It does not check external URLs (see [`remark-lint-no-dead-urls`][no-dead-urls]
for that).

For example, this document does not have a heading named `Hello`.
So if we link to that (`[welcome](#hello)`), this plugin will warn
about it.

In addition, when I link to a heading in another document
(`examples/foo.md#hello`), if this file exists but the heading does not,
or if the file does not exist, this plugin will also warn.

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
var vfile = require('to-vfile')
var report = require('vfile-reporter')
var remark = require('remark')
var links = require('remark-validate-links')

remark()
  .use(links)
  .process(vfile.readSync('example.md'), function(err, file) {
    console.error(report(err || file))
  })
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
*   [`remark-lint-no-dead-urls`][no-dead-urls] — Ensure external links are alive

## Contribute

See [`contributing.md` in `remarkjs/remark`][contributing] for ways to get
started.

This organisation has a [Code of Conduct][coc].  By interacting with this
repository, organisation, or community you agree to abide by its terms.

## License

[MIT][license] © [Titus Wormer][author]

<!-- Definitions -->

[build-badge]: https://img.shields.io/travis/remarkjs/remark-validate-links.svg

[build]: https://travis-ci.org/remarkjs/remark-validate-links

[coverage-badge]: https://img.shields.io/codecov/c/github/remarkjs/remark-validate-links.svg

[coverage]: https://codecov.io/github/remarkjs/remark-validate-links

[downloads-badge]: https://img.shields.io/npm/dm/remark-validate-links.svg

[downloads]: https://www.npmjs.com/package/remark-validate-links

[chat-badge]: https://img.shields.io/badge/join%20the%20community-on%20spectrum-7b16ff.svg

[chat]: https://spectrum.chat/unified/remark

[sponsors-badge]: https://opencollective.com/unified/sponsors/badge.svg

[backers-badge]: https://opencollective.com/unified/backers/badge.svg

[collective]: https://opencollective.com/unified

[license]: license

[author]: https://wooorm.com

[npm]: https://docs.npmjs.com/cli/install

[remark]: https://github.com/remarkjs/remark

[remark-lint]: https://github.com/remarkjs/remark-lint

[no-dead-urls]: https://github.com/davidtheclark/remark-lint-no-dead-urls

[remark-html]: https://github.com/remarkjs/remark-html

[package-repository]: https://docs.npmjs.com/files/package.json#repository

[cli]: https://github.com/remarkjs/remark/tree/master/packages/remark-cli#readme

[contributing]: https://github.com/remarkjs/remark/blob/master/contributing.md

[coc]: https://github.com/remarkjs/remark/blob/master/code-of-conduct.md
