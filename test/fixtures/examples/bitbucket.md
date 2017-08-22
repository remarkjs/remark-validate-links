# Hello

This is a valid relative heading [link](#markdown-header-hello).

This is an invalid relative heading [link](#markdown-header-world).

## Files

This is a valid relative file [link](https://bitbucket.org/wooorm/test/src/master/bitbucket.md).

So is this [link](https://bitbucket.org/wooorm/test/src/foo-bar/bitbucket.md).

And this [link](../bitbucket.md).

This is an invalid relative file [link](https://bitbucket.org/wooorm/test/src/master/world.md).

So is this [link](https://bitbucket.org/wooorm/test/src/foo-bar/world.md).

And this [link](../world.md).

## Combination

Valid: [a](../bitbucket.md#markdown-header-hello).

Valid: [b](https://bitbucket.org/wooorm/test/src/master/bitbucket.md#markdown-header-hello).

Valid: [c](https://bitbucket.org/wooorm/test/src/foo-bar/bitbucket.md#markdown-header-hello).

Invalid: [d](../bitbucket.md#markdown-header-world).

Invalid: [e](https://bitbucket.org/wooorm/test/src/master/bitbucket.md#markdown-header-world).

Invalid: [f](https://bitbucket.org/wooorm/test/src/foo-bar/bitbucket.md#markdown-header-world).

Invalid: [g](../world.md#markdown-header-hello).

Invalid: [h](https://bitbucket.org/wooorm/test/src/master/world.md#markdown-header-hello).

Invalid: [i](https://bitbucket.org/wooorm/test/src/foo-bar/world.md#markdown-header-hello).
