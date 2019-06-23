# Hello

This is a valid relative heading [link](#hello).

This is an invalid relative heading [link](#world).

## Files

This is a valid relative file [link](https://github.com/wooorm/test/blob/master/examples/github.md).

This is a valid absolute file [link](/wooorm/test/blob/master/examples/github.md).

So is this [link](https://github.com/wooorm/test/blob/foo-bar/examples/github.md).

And this [link](./examples/github.md).

And this [link](examples/github.md).

This is a valid external [file](../index.js).

This is an invalid relative file [link](https://github.com/wooorm/test/blob/master/examples/world.md).

This is an invalid absolute file [link](/wooorm/test/blob/master/examples/world.md).

So is this [link](https://github.com/wooorm/test/blob/foo-bar/examples/world.md).

And this [link](./examples/world.md).

And this [link](examples/world.md).

## Combination

Valid: [a](./examples/github.md#hello).

Valid: [b](examples/github.md#hello).

Valid: [c](https://github.com/wooorm/test/blob/master/examples/github.md#hello).

Valid: [d](https://github.com/wooorm/test/blob/foo-bar/examples/github.md#hello).

Invalid: [e](./examples/github.md#world).

Invalid: [f](examples/github.md#world).

Invalid: [g](https://github.com/wooorm/test/blob/master/examples/github.md#world).

Invalid: [h](https://github.com/wooorm/test/blob/foo-bar/examples/github.md#world).

Invalid: [i](./examples/world.md#hello).

Invalid: [j](examples/world.md#hello).

Invalid: [k](https://github.com/wooorm/test/blob/master/examples/world.md#hello).

Invalid: [l](https://github.com/wooorm/test/blob/foo-bar/examples/world.md#hello).

## External

These are all invalid, because they do not link to GitHub.

Valid: [a](irc://foo).

Valid: [b](http://example.com).

Valid: [b](http://example.com/foo/bar/baz).

Valid: [b](http://bitbucket.com/wooorm/test/blob/foo-bar/examples/world.md#hello).
