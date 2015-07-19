# Hello

This is a valid relative heading [link](#hello).

This is an invalid relative heading [link](#world).

## Files

This is a valid relative file [link](https://github.com/wooorm/test/blob/master/examples/example.md).

So is this [link](https://github.com/wooorm/test/blob/foo-bar/examples/example.md).

And this [link](./examples/example.md).

And this [link](examples/example.md).

This is a valid external [file](../index.js).

This is an invalid relative file [link](https://github.com/wooorm/test/blob/master/examples/world.md).

So is this [link](https://github.com/wooorm/test/blob/foo-bar/examples/world.md).

And this [link](./examples/world.md).

And this [link](examples/world.md).

## Combination

Valid: [a](./examples/example.md#hello).

Valid: [b](examples/example.md#hello).

Valid: [c](https://github.com/wooorm/test/blob/master/examples/example.md#hello).

Valid: [d](https://github.com/wooorm/test/blob/foo-bar/examples/example.md#hello).

Invalid: [e](./examples/example.md#world).

Invalid: [f](examples/example.md#world).

Invalid: [g](https://github.com/wooorm/test/blob/master/examples/example.md#world).

Invalid: [h](https://github.com/wooorm/test/blob/foo-bar/examples/example.md#world).

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
