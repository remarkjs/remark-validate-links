# remark-validate-links [![Build Status][travis-badge]][travis] [![Coverage Status][codecov-badge]][codecov]

[**remark**][remark] plug-in to validate if links to headings and files
in markdown point to existing things.

For example, this document does not have a heading named `Hello`. So if I
link to that (`[welcome](#hello)`), this plug-in will warn about it.

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
*   [License](#license)

## Installation

[npm][npm-install]:

```bash
npm install remark-validate-links
```

## Command line

![Example of how remark-validate-links looks on screen][screenshot]

Use **remark-validate-links** together with [**remark**][remark]:

```bash
npm install --global remark remark-validate-links
```

Let’s say `readme.md` is this document, and `example.md` looks as follows:

```md
# Hello

Read more [whoops, this does not exist](#world).

This doesn’t exist either [whoops!](readme.md#foo).

But this does exist: [LICENSE](LICENSE).

So does this: [README](readme.md#installation).
```

Then, to run **remark-validate-links** on `example.md` and `readme.md`:

```bash
remark -u remark-validate-links example.md
#
# Yields:
#
# example.md
#   3:11  warning  Link to unknown heading: `world`
#   5:27  warning  Link to unknown heading in `readme.md`: `foo`
#
# ✖ 2 problems (0 errors, 2 warnings)
```

## Programmatic

This plug-in is **not** available on the API of remark.

## Configuration

You can pass a `repository`, containing anything `package.json`s
[`repository`][package-repository] can handle. If this is omitted,
**remark-validate-links** will try the `package.json` in your
current working directory.

```bash
remark --use 'validate-links=repository:"foo/bar"' example.md
```

When a repository is given or detected, links to GitHub are normalized
to the file-system. E.g., `https://github.com/foo/bar/blob/master/example.md`
becomes `example.md`.

You can define this repository in `.remarkrc` or `package.json`
[files][remarkrc] too. An example `.remarkrc` file could look as follows:

```json
{
  "plugins": {
    "validate-links": {
      "repository": "foo/bar"
    }
  }
}
```

## Integration

**remark-validate-links** can detect anchors on nodes through
several properties on nodes:

*   `node.data.htmlAttributes.name` — Used by [`remark-html`][remark-html]
    to create a `name` attribute, which anchors can link to;

*   `node.data.htmlAttributes.id` — Used by [`remark-html`][remark-html]
    to create an `id` attribute, which anchors can link to;

*   `node.data.id` — Used, in the future, by other tools to signal
    unique identifiers on nodes.

## Related

*   [`wooorm/remark-lint`][remark-lint]
    — Markdown code style linter.

## License

[MIT][license] © [Titus Wormer][author]

<!-- Definitions -->

[travis-badge]: https://img.shields.io/travis/wooorm/remark-validate-links.svg

[travis]: https://travis-ci.org/wooorm/remark-validate-links

[codecov-badge]: https://img.shields.io/codecov/c/github/wooorm/remark-validate-links.svg

[codecov]: https://codecov.io/github/wooorm/remark-validate-links

[npm-install]: https://docs.npmjs.com/cli/install

[license]: LICENSE

[author]: http://wooorm.com

[remark]: https://github.com/wooorm/remark

[remark-lint]: https://github.com/wooorm/remark-lint

[remark-html]: https://github.com/wooorm/remark-html

[screenshot]: https://cdn.rawgit.com/wooorm/remark-validate-links/master/screenshot.png

[package-repository]: https://docs.npmjs.com/files/package.json#repository

[remarkrc]: https://github.com/wooorm/remark/blob/master/doc/remarkrc.5.md
