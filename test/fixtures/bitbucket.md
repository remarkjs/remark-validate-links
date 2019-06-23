# Hello

This is a valid relative heading [link](#markdown-header-hello).

This is an invalid relative heading [link](#markdown-header-world).

This is an ignored hash [link](#world).

## Files

This is a valid relative file [link](https://bitbucket.org/wooorm/test/src/master/examples/bitbucket.md).

So is this [link](https://bitbucket.org/wooorm/test/src/foo-bar/examples/bitbucket.md).

And this [link](./examples/bitbucket.md).

And this [link](examples/bitbucket.md).

This is a valid external [file](../index.js).

This is an invalid relative file [link](https://bitbucket.org/wooorm/test/src/master/examples/world.md).

So is this [link](https://bitbucket.org/wooorm/test/src/foo-bar/examples/world.md).

And this [link](./examples/world.md).

And this [link](examples/world.md).

## Combination

Valid: [a](./examples/bitbucket.md#markdown-header-hello).

Valid: [b](examples/bitbucket.md#markdown-header-hello).

Valid: [c](https://bitbucket.org/wooorm/test/src/master/examples/bitbucket.md#markdown-header-hello).

Valid: [d](https://bitbucket.org/wooorm/test/src/foo-bar/examples/bitbucket.md#markdown-header-hello).

Invalid: [e](./examples/bitbucket.md#markdown-header-world).

Invalid: [f](examples/bitbucket.md#markdown-header-world).

Invalid: [g](https://bitbucket.org/wooorm/test/src/master/examples/bitbucket.md#markdown-header-world).

Invalid: [h](https://bitbucket.org/wooorm/test/src/foo-bar/examples/bitbucket.md#markdown-header-world).

Invalid: [i](./examples/world.md#markdown-header-hello).

Invalid: [j](examples/world.md#markdown-header-hello).

Invalid: [k](https://bitbucket.org/wooorm/test/src/master/examples/world.md#markdown-header-hello).

Invalid: [l](https://bitbucket.org/wooorm/test/src/foo-bar/examples/world.md#markdown-header-hello).

This is an ignored hash [j](https://bitbucket.org/wooorm/test/src/foo-bar/examples/bitbucket.md#world).

## External

These are all invalid, because they do not link to Bitbucket.

Valid: [a](irc://foo).

Valid: [b](http://example.com).

Valid: [b](http://example.com/foo/bar/baz).

Valid: [b](http://github.com/wooorm/test/blob/foo-bar/examples/world.md#markdown-header-hello).
