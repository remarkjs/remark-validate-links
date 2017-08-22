# remark-validate-links [![Build Status][build-badge]][build-status] [![Coverage Status][coverage-badge]][coverage-status] [![Chat][chat-badge]][chat]

[**remark**][remark] plug-in to validate if links to headings and files
in markdown point to existing things.

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
  3:11-3:48  warning  Link to unknown heading: `world`               remark-validate-links  remark-validate-links
  5:27-5:51  warning  Link to unknown heading in `readme.md`: `foo`  remark-validate-links  remark-validate-links

readme.md: no issues found

⚠ 2 warnings
```

## Programmatic

This plug-in is **not** available on the API of remark.

## Configuration

You can pass a `repository`, containing anything `package.json`s
[`repository`][package-repository] can handle.  If this is omitted,
`remark-validate-links` will try the `package.json` in your current working
directory.

```bash
remark --use 'validate-links=repository:"foo/bar"' example.md
```

When a repository is given or detected (supporting GitHub, GitLab, and
Bitbucket), links to the only files are normalized to the file-system.
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

## License

[MIT][license] © [Titus Wormer][author]

<!-- Definitions -->

[build-badge]: https://img.shields.io/travis/wooorm/remark-validate-links.svg

[build-status]: https://travis-ci.org/wooorm/remark-validate-links

[coverage-badge]: https://img.shields.io/codecov/c/github/wooorm/remark-validate-links.svg

[coverage-status]: https://codecov.io/github/wooorm/remark-validate-links

[chat-badge]: https://img.shields.io/gitter/room/wooorm/remark.svg

[chat]: https://gitter.im/wooorm/remark

[license]: LICENSE

[author]: http://wooorm.com

[npm]: https://docs.npmjs.com/cli/install

[remark]: https://github.com/wooorm/remark

[remark-lint]: https://github.com/wooorm/remark-lint

[remark-html]: https://github.com/wooorm/remark-html

[package-repository]: https://docs.npmjs.com/files/package.json#repository

[cli]: https://github.com/wooorm/remark/tree/master/packages/remark-cli#readme
