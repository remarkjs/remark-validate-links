# remark-validate-links

[![Build][build-badge]][build]
[![Coverage][coverage-badge]][coverage]
[![Downloads][downloads-badge]][downloads]
[![Size][size-badge]][size]
[![Sponsors][sponsors-badge]][collective]
[![Backers][backers-badge]][collective]
[![Chat][chat-badge]][chat]

[**remark**][remark] plugin to validate that Markdown links and images reference
existing local files and headings.
It does not check external URLs (see [`remark-lint-no-dead-urls`][no-dead-urls]
for that).

For example, this document does not have a heading named `Hello`.
So if we link to that (`[welcome](#hello)`), this plugin will warn about it.

In addition, when there’s a link to a heading in another document
(`examples/foo.md#hello`), if this file exists but the heading does not, or if
the file does not exist, this plugin will also warn.

Linking to other files, such as `license` or `index.js` (when they exist) is
fine.

## Table of Contents

*   [Install](#install)
*   [Use](#use)
    *   [CLI](#cli)
    *   [API](#api)
*   [Configuration](#configuration)
*   [Integration](#integration)
*   [Security](#security)
*   [Related](#related)
*   [Contribute](#contribute)
*   [License](#license)

## Install

[npm][]:

```sh
npm install remark-validate-links
```

## Use

### CLI

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

> Note: passing a file over stdin(4) may not work as expected, because it is not
> known where the file originates from.

### API

> Note: The API checks links to headings and files.
> It does not check headings in other files.
> In a browser, only local links to headings are checked.

Say we have the following file, `example.md`:

```markdown
# Alpha

This [exists](#alpha).
This [one does not](#does-not).
References and definitions are [checked][alpha] [too][charlie].

# Bravo

Headings in `readme.md` are [not checked](readme.md#bravo).
But [missing files are reported](missing-example.js).

[alpha]: #alpha
[charlie]: #charlie
```

And our script, `example.js`, looks as follows:

```js
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
    4:6-4:31  warning  Link to unknown heading: `does-not`         missing-heading  remark-validate-links
  10:5-10:53  warning  Link to unknown file: `missing-example.js`  missing-file     remark-validate-links
  13:1-13:20  warning  Link to unknown heading: `charlie`          missing-heading  remark-validate-links

⚠ 3 warnings
```

## Configuration

Typically, you don’t need to configure `remark-validate-links`, as it detects
local Git repositories.
If one is detected that references a known Git host, some extra links can be
checked.
If one is detected that does not reference a known Git host, local links still
work as expected.
If you’re not in a Git repository, you must pass `repository: false` explicitly.

You can pass a `repository` (`string?`, `false`).
If `repository` is nullish, the Git origin remote is detected.
If the repository resolves to something [npm understands][package-repository]
as a Git host such as GitHub, GitLab, or Bitbucket, full URLs to that host
(say, `https://github.com/remarkjs/remark-validate-links/readme.md#install`)
can also be checked.

```sh
remark --use 'validate-links=repository:"foo/bar"' example.md
```

For this to work, a `root` (`string?`) is also used, referencing the local Git
root directory (the place where `.git` is).
If both `root` and `repository` are nullish, the Git root is detected.
If `root` is not given but `repository` is, [`file.cwd`][cwd] is used.

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

If you’re self-hosting a Git server, you can provide URL information directly,
as `urlConfig` (`Object`).

For this repository, `urlConfig` looks as follows:

```js
{
  // Domain of URLs:
  hostname: 'github.com',
  // Path prefix before files:
  prefix: '/remarkjs/remark-validate-links/blob/',
  // Prefix of headings:
  headingPrefix: '#',
  // Whether lines in files can be linked:
  lines: true
}
```

If this project were hosted on Bitbucket, it would be:

```js
{
  hostname: 'bitbucket.org',
  prefix: '/remarkjs/remark-validate-links/src/',
  headingPrefix: '#markdown-header-',
  lines: false
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

## Security

`remark-validate-links`, in Node, accesses the file system based on user
content, and this may be dangerous.
In Node `git remote` and `git rev-parse` also runs for processed files.

The tree is not modified, so there are no openings for
[cross-site scripting (XSS)][xss] attacks.

## Related

*   [`remark-lint`][remark-lint] — Markdown code style linter
*   [`remark-lint-no-dead-urls`][no-dead-urls] — Ensure external links are alive

## Contribute

See [`contributing.md`][contributing] in [`remarkjs/.github`][health] for ways
to get started.
See [`support.md`][support] for ways to get help.

This project has a [code of conduct][coc].
By interacting with this repository, organization, or community you agree to
abide by its terms.

## License

[MIT][license] © [Titus Wormer][author]

<!-- Definitions -->

[build-badge]: https://img.shields.io/travis/remarkjs/remark-validate-links/master.svg

[build]: https://travis-ci.org/remarkjs/remark-validate-links

[coverage-badge]: https://img.shields.io/codecov/c/github/remarkjs/remark-validate-links.svg

[coverage]: https://codecov.io/github/remarkjs/remark-validate-links

[downloads-badge]: https://img.shields.io/npm/dm/remark-validate-links.svg

[downloads]: https://www.npmjs.com/package/remark-validate-links

[size-badge]: https://img.shields.io/bundlephobia/minzip/remark-validate-links.svg

[size]: https://bundlephobia.com/result?p=remark-validate-links

[sponsors-badge]: https://opencollective.com/unified/sponsors/badge.svg

[backers-badge]: https://opencollective.com/unified/backers/badge.svg

[collective]: https://opencollective.com/unified

[chat-badge]: https://img.shields.io/badge/chat-spectrum-7b16ff.svg

[chat]: https://spectrum.chat/unified/remark

[npm]: https://docs.npmjs.com/cli/install

[health]: https://github.com/remarkjs/.github

[contributing]: https://github.com/remarkjs/.github/blob/master/contributing.md

[support]: https://github.com/remarkjs/.github/blob/master/support.md

[coc]: https://github.com/remarkjs/.github/blob/master/code-of-conduct.md

[license]: license

[author]: https://wooorm.com

[remark]: https://github.com/remarkjs/remark

[cli]: https://github.com/remarkjs/remark/tree/master/packages/remark-cli#readme

[remark-lint]: https://github.com/remarkjs/remark-lint

[remark-html]: https://github.com/remarkjs/remark-html

[no-dead-urls]: https://github.com/davidtheclark/remark-lint-no-dead-urls

[package-repository]: https://docs.npmjs.com/files/package.json#repository

[cwd]: https://github.com/vfile/vfile#vfilecwd

[xss]: https://en.wikipedia.org/wiki/Cross-site_scripting
