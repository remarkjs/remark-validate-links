# Hello

This is a valid relative heading [link](#hello).

This is an invalid relative heading [link](#world).

## Files

This is a valid relative file [link](https://gitlab.com/wooorm/test/blob/master/examples/gitlab.md).

So is this [link](https://gitlab.com/wooorm/test/blob/foo-bar/examples/gitlab.md).

And this [link](./examples/gitlab.md).

And this [link](examples/gitlab.md).

This is a valid external [file](../index.js).

This is an invalid relative file [link](https://gitlab.com/wooorm/test/blob/master/examples/world.md).

So is this [link](https://gitlab.com/wooorm/test/blob/foo-bar/examples/world.md).

And this [link](./examples/world.md).

And this [link](examples/world.md).

## Combination

Valid: [a](./examples/gitlab.md#hello).

Valid: [b](examples/gitlab.md#hello).

Valid: [c](https://gitlab.com/wooorm/test/blob/master/examples/gitlab.md#hello).

Valid: [d](https://gitlab.com/wooorm/test/blob/foo-bar/examples/gitlab.md#hello).

Invalid: [e](./examples/gitlab.md#world).

Invalid: [f](examples/gitlab.md#world).

Invalid: [g](https://gitlab.com/wooorm/test/blob/master/examples/gitlab.md#world).

Invalid: [h](https://gitlab.com/wooorm/test/blob/foo-bar/examples/gitlab.md#world).

Invalid: [i](./examples/world.md#hello).

Invalid: [j](examples/world.md#hello).

Invalid: [k](https://gitlab.com/wooorm/test/blob/master/examples/world.md#hello).

Invalid: [l](https://gitlab.com/wooorm/test/blob/foo-bar/examples/world.md#hello).

## External

These are all invalid, because they do not link to GitLab.

Valid: [a](irc://foo).

Valid: [b](http://example.com).

Valid: [b](http://example.com/foo/bar/baz).

Valid: [b](http://bitbucket.com/wooorm/test/blob/foo-bar/examples/world.md#hello).

## Top Anchor

This links to the start of the document [link](#readme).
