# mdast-validate-links [![Build Status](https://img.shields.io/travis/wooorm/mdast-validate-links.svg)](https://travis-ci.org/wooorm/mdast-validate-links) [![Coverage Status](https://img.shields.io/codecov/c/github/wooorm/mdast-validate-links.svg)](https://codecov.io/github/wooorm/mdast-validate-links)

[**mdast**](https://github.com/wooorm/mdast) plug-in to validate if links to
headings and files in markdown point to existing things.

For example, this document does not have a heading named `Hello`. So if I
link to that (`[welcome](#hello)`), this plug-in will warn about it.

In addition, when I link to a heading in another document
(`examples/foo.md#hello`), if this file exists but the heading does not,
or if the file does not exist, this plug-in will also warn.

Linking to other files, such as `LICENSE` or `index.js` (when they exist)
is fine.

## Installation

[npm](https://docs.npmjs.com/cli/install):

```bash
npm install mdast-validate-links
```

## Command line

![Example of how mdast-validate-links looks on screen](https://cdn.rawgit.com/wooorm/mdast-validate-links/master/screenshot.png)

Use **mdast-validate-links** together with [**mdast**](https://github.com/wooorm/mdast)
and [**mdast-slug**](https://github.com/wooorm/mdast-slug):

```bash
npm install --global mdast mdast-slug mdast-validate-links
```

Let’s say `readme.md` is this document, and `example.md` looks as follows:

```md
# Hello

Read more [whoops, this does not exist](#world).

This doesn’t exist either [whoops!](readme.md#foo).

But this does exist: [LICENSE](LICENSE).

So does this: [README](readme.md#installation).
```

Then, to run **mdast-validate-links** on `example.md` and `readme.md`:

```bash
mdast -u mdast-slug -u mdast-validate-links example.md
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

This plug-in is **not** available on the API of mdast.

## Configuration

You can pass a `repository`, containing anything `package.json`s
[`repository`](https://docs.npmjs.com/files/package.json#repository) can
handle. If this is omitted, **mdast-validate-links** will try
the `package.json` in your current working directory.

```bash
mdast --use 'validate-links=repository:"foo/bar"' example.md
```

When a repository is given or detected, links to GitHub are normalized
to the file-system. E.g., `https://github.com/foo/bar/blob/master/example.md`
becomes `example.md`.

You can define this repository in `.mdastrc` or `package.json` [files](https://github.com/wooorm/mdast/blob/master/doc/mdastrc.5.md)
too. An example `.mdastrc` file could look as follows:

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

## License

[MIT](LICENSE) © [Titus Wormer](http://wooorm.com)
