# remark-validate-links [![Build Status](https://img.shields.io/travis/wooorm/remark-validate-links.svg)](https://travis-ci.org/wooorm/remark-validate-links) [![Coverage Status](https://img.shields.io/codecov/c/github/wooorm/remark-validate-links.svg)](https://codecov.io/github/wooorm/remark-validate-links)

[**remark**](https://github.com/wooorm/remark) plug-in to validate if links to
headings and files in markdown point to existing things.

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
*   [Related](#related)
*   [License](#license)

## Installation

[npm](https://docs.npmjs.com/cli/install):

```bash
npm install remark-validate-links
```

## Command line

![Example of how remark-validate-links looks on screen](https://cdn.rawgit.com/wooorm/remark-validate-links/master/screenshot.png)

Use **remark-validate-links** together with [**remark**](https://github.com/wooorm/remark)
and [**remark-slug**](https://github.com/wooorm/remark-slug):

```bash
npm install --global remark remark-slug remark-validate-links
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
remark -u remark-slug -u remark-validate-links example.md
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
[`repository`](https://docs.npmjs.com/files/package.json#repository) can
handle. If this is omitted, **remark-validate-links** will try
the `package.json` in your current working directory.

```bash
remark --use 'validate-links=repository:"foo/bar"' example.md
```

When a repository is given or detected, links to GitHub are normalized
to the file-system. E.g., `https://github.com/foo/bar/blob/master/example.md`
becomes `example.md`.

You can define this repository in `.remarkrc` or `package.json` [files](https://github.com/wooorm/remark/blob/master/doc/remarkrc.5.md)
too. An example `.remarkrc` file could look as follows:

```json
{
  "plugins": {
    "slug": {
      "library": "github"
    },
    "validate-links": {
      "repository": "foo/bar"
    }
  }
}
```

## Related

*   [`remark-lint`](https://github.com/wooorm/remark-lint)
    — Markdown code style linter.

## License

[MIT](LICENSE) © [Titus Wormer](http://wooorm.com)
