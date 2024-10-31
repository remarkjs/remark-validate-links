# remark-validate-links

[![Build][build-badge]][build]
[![Coverage][coverage-badge]][coverage]
[![Downloads][downloads-badge]][downloads]
[![Sponsors][sponsors-badge]][collective]
[![Backers][backers-badge]][collective]
[![Chat][chat-badge]][chat]

**[remark][]** plugin to check that markdown links and images point to existing
local files and headings in a Git repo.

For example, this document does not have a heading named `Hello`.
So if we’d link to it (`[welcome](#hello)`), we’d get a warning.
Links to headings in other markdown documents (`examples/foo.md#hello`) and
links to files (`license` or `index.js`) are also checked.

This is specifically for Git repos.
Like this one.
Not for say a website.

## Contents

* [What is this?](#what-is-this)
* [When should I use this?](#when-should-i-use-this)
* [Install](#install)
* [Use](#use)
* [API](#api)
  * [`unified().use(remarkValidateLinks[, options])`](#unifieduseremarkvalidatelinks-options)
  * [`Options`](#options)
  * [`UrlConfig`](#urlconfig)
* [Examples](#examples)
  * [Example: CLI](#example-cli)
  * [Example: CLI in npm scripts](#example-cli-in-npm-scripts)
* [Integration](#integration)
* [Types](#types)
* [Compatibility](#compatibility)
* [Security](#security)
* [Related](#related)
* [Contribute](#contribute)
* [License](#license)

## What is this?

This package is a [unified][] ([remark][]) plugin to check local links in a Git
repo.

## When should I use this?

This project is useful if you have a Git repo, such as this one, with docs in
markdown and links to headings and other files, and want to check whether
they’re correct.
Compared to other links checkers, this project can work offline (making it fast
en prone to fewer false positives), and is specifically made for local links in
Git repos.
This plugin does not check external URLs (see
[`remark-lint-no-dead-urls`][remark-lint-no-dead-urls]) or undefined references
(see
[`remark-lint-no-undefined-references`][remark-lint-no-undefined-references]).

## Install

This package is [ESM only][esm].
In Node.js (version 16+), install with [npm][]:

```sh
npm install remark-validate-links
```

In Deno with [`esm.sh`][esmsh]:

```js
import remarkValidateLinks from 'https://esm.sh/remark-validate-links@13'
```

In browsers with [`esm.sh`][esmsh]:

```html
<script type="module">
  import remarkValidateLinks from 'https://esm.sh/remark-validate-links@13?bundle'
</script>
```

## Use

Say we have the following file `example.md` in this project:

```markdown
# Alpha

Links are checked:

This [exists](#alpha).
This [one does not](#apha).

# Bravo

Headings in `readme.md` are [checked](readme.md#no-such-heading).
And [missing files are reported](missing-example.js).

Definitions are also checked:

[alpha]: #alpha
[charlie]: #charlie

References w/o definitions are not checked: [delta]
```

…and a module `example.js`:

```js
import remarkValidateLinks from 'remark-validate-links'
import {remark} from 'remark'
import {read} from 'to-vfile'
import {reporter} from 'vfile-reporter'

const file = await remark()
  .use(remarkValidateLinks)
  .process(await read('example.md'))

console.log(reporter(file))
```

…then running `node example.js` yields:

```markdown
example.md
6:6-6:27   warning Cannot find heading for `#apha`; did you mean `alpha` missing-heading remark-validate-links:missing-heading
11:5-11:53 warning Cannot find file `missing-example.js`                 missing-file    remark-validate-links:missing-file
16:1-16:20 warning Cannot find heading for `#charlie`                    missing-heading remark-validate-links:missing-heading

⚠ 3 warnings
```

> 👉 **Note**: `readme.md#no-such-heading` is not warned about on the API, as it
> does not check headings in other markdown files.
> The remark CLI is able to do that.

## API

This package exports no identifiers.
The default export is [`remarkValidateLinks`][api-remark-validate-links].

### `unified().use(remarkValidateLinks[, options])`

Check that markdown links and images point to existing local files and headings
in a Git repo.

> ⚠️ **Important**: The API in Node.js checks links to headings and files but
> does not check whether headings in other files exist.
> The API in browsers only checks links to headings in the same file.
> The CLI can check everything.

###### Parameters

* `options` ([`Options`][api-options], optional)
  — configuration

###### Returns

Transform ([`Transformer`][unified-transformer]).

### `Options`

Configuration (TypeScript type).

###### Fields

* `repository` (`string` or `false`, default: detected from Git remote)
  — URL to hosted Git;
  if you’re not in a Git repository, you must pass `false`;
  if the repository resolves to something npm understands as a Git host such
  as GitHub, GitLab, or Bitbucket, full URLs to that host (say,
  `https://github.com/remarkjs/remark-validate-links/readme.md#install`) are
  checked
* `root` (`string`, default: local Git folder)
  — path to Git root folder;
  if both `root` and `repository` are nullish, the Git root is detected;
  if `root` is not given but `repository` is, `file.cwd` is used
* `urlConfig` ([`UrlConfig`][api-url-config], default: detected from repo)
  — config on how hosted Git works;
  `github.com`, `gitlab.com`, or `bitbucket.org` work automatically;
  otherwise, pass `urlConfig` manually

### `UrlConfig`

Hosted Git info (TypeScript type).

###### Fields

* `headingPrefix` (`string`, optional, example: `'#'`, `'#markdown-header-'`)
  — prefix of headings
* `hostname` (`string`, optional, example: `'github.com'`,
  `'bitbucket.org'`)
  — domain of URLs
* `lines` (`boolean`, default: `false`)
  — whether lines in files can be linked
* `path` (`string`, optional, example:
  `'/remarkjs/remark-validate-links/blob/'`,
  `'/remarkjs/remark-validate-links/src/'`)
  — path prefix before files
* `topAnchor` (`string`, optional, example: `#readme`)
  — hash to top of readme

###### Notes

For this repository (`remarkjs/remark-validate-links` on GitHub) `urlConfig`
looks as follows:

```js
{
  // Domain of URLs:
  hostname: 'github.com',
  // Path prefix before files:
  prefix: '/remarkjs/remark-validate-links/blob/',
  // Prefix of headings:
  headingPrefix: '#',
  // Hash to top of markdown documents:
  topAnchor: '#readme',
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

## Examples

### Example: CLI

It’s recommended to use `remark-validate-links` on the CLI with
[`remark-cli`][remark-cli].
Install both with [npm][]:

```sh
npm install remark-cli remark-validate-links --save-dev
```

Let’s say we have a `readme.md` (this current document) and an `example.md`
with the following text:

```markdown
# Hello

Read more [whoops, this does not exist](#world).

This doesn’t exist either [whoops!](readme.md#foo).

But this does exist: [license](license).

So does this: [readme](readme.md#install).
```

Now, running `./node_modules/.bin/remark --use remark-validate-links .` yields:

<!-- To do: regenerate. -->

```txt
example.md
  3:11-3:48  warning  Link to unknown heading: `world`               missing-heading          remark-validate-links
  5:27-5:51  warning  Link to unknown heading in `readme.md`: `foo`  missing-heading-in-file  remark-validate-links

readme.md: no issues found

⚠ 2 warnings
```

### Example: CLI in npm scripts

You can use `remark-validate-links` and [`remark-cli`][remark-cli] in an npm
script to check and format markdown in your project.
Install both with [npm][]:

```sh
npm install remark-cli remark-validate-links --save-dev
```

Then, add a format script and configuration to `package.json`:

```js
{
  // …
  "scripts": {
    // …
    "format": "remark . --quiet --frail --output",
    // …
  },
  "remarkConfig": {
    "plugins": [
      "remark-validate-links"
    ]
  },
  // …
}
```

> 💡 **Tip**: Add other tools such as prettier or ESLint to check and format
> other files.
>
> 💡 **Tip**: Run `./node_modules/.bin/remark --help` for help with
> `remark-cli`.

Now you check and format markdown in your project with:

```sh
npm run format
```

## Integration

`remark-validate-links` can detect anchors on nodes through several properties
on nodes:

* `node.data.hProperties.name` — Used by
  [`mdast-util-to-hast`][mdast-util-to-hast]
  to create a `name` attribute, which anchors can link to
* `node.data.hProperties.id` — Used by
  [`mdast-util-to-hast`][mdast-util-to-hast]
  to create an `id` attribute, which anchors can link to
* `node.data.id` — Used potentially in the future by other tools to signal
  unique identifiers on nodes

## Types

This package is fully typed with [TypeScript][].
It exports the additional types [`Options`][api-options] and
[`UrlConfig`][api-url-config].

## Compatibility

Projects maintained by the unified collective are compatible with maintained
versions of Node.js.

When we cut a new major release, we drop support for unmaintained versions of
Node.
This means we try to keep the current release line,
`remark-validate-links@^13`, compatible with Node.js 16.

This plugin works with `unified` version 6+, `remark` version 7+, and
`remark-cli` version 8+.

## Security

`remark-validate-links`, in Node, accesses the file system based on user
content, and this may be dangerous.
In Node `git remote` and `git rev-parse` also runs for processed files.

The tree is not modified, so there are no openings for
[cross-site scripting (XSS)][wiki-xss] attacks.

## Related

* [`remark-lint`][remark-lint]
  — markdown code style linter
* [`remark-lint-no-dead-urls`][remark-lint-no-dead-urls]
  — check that external links are alive

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

[build-badge]: https://github.com/remarkjs/remark-validate-links/workflows/main/badge.svg

[build]: https://github.com/remarkjs/remark-validate-links/actions

[coverage-badge]: https://img.shields.io/codecov/c/github/remarkjs/remark-validate-links.svg

[coverage]: https://codecov.io/github/remarkjs/remark-validate-links

[downloads-badge]: https://img.shields.io/npm/dm/remark-validate-links.svg

[downloads]: https://www.npmjs.com/package/remark-validate-links

[sponsors-badge]: https://opencollective.com/unified/sponsors/badge.svg

[backers-badge]: https://opencollective.com/unified/backers/badge.svg

[collective]: https://opencollective.com/unified

[chat-badge]: https://img.shields.io/badge/chat-discussions-success.svg

[chat]: https://github.com/remarkjs/remark/discussions

[npm]: https://docs.npmjs.com/cli/install

[esm]: https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c

[esmsh]: https://esm.sh

[health]: https://github.com/remarkjs/.github

[contributing]: https://github.com/remarkjs/.github/blob/main/contributing.md

[support]: https://github.com/remarkjs/.github/blob/main/support.md

[coc]: https://github.com/remarkjs/.github/blob/main/code-of-conduct.md

[license]: license

[author]: https://wooorm.com

[mdast-util-to-hast]: https://github.com/syntax-tree/mdast-util-to-hast#notes

[remark]: https://github.com/remarkjs/remark

[remark-cli]: https://github.com/remarkjs/remark/tree/main/packages/remark-cli#readme

[remark-lint]: https://github.com/remarkjs/remark-lint

[remark-lint-no-dead-urls]: https://github.com/remarkjs/remark-lint-no-dead-urls

[remark-lint-no-undefined-references]: https://github.com/remarkjs/remark-lint/tree/master/packages/remark-lint-no-undefined-references

[typescript]: https://www.typescriptlang.org

[unified]: https://github.com/unifiedjs/unified

[unified-transformer]: https://github.com/unifiedjs/unified#transformer

[wiki-xss]: https://en.wikipedia.org/wiki/Cross-site_scripting

[api-options]: #options

[api-remark-validate-links]: #unifieduseremarkvalidatelinks-options

[api-url-config]: #urlconfig
