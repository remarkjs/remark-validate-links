# Hello

This is a valid relative heading [link](#hello).

This is an invalid relative heading [link](#world).

## Files

This is a valid relative file [link](https://github.com/wooorm/test/blob/master/github.md).

So is this [link](https://github.com/wooorm/test/blob/foo-bar/github.md).

And this [link](../github.md).

This is an invalid relative file [link](https://github.com/wooorm/test/blob/master/world.md).

So is this [link](https://github.com/wooorm/test/blob/foo-bar/world.md).

And this [link](../world.md).

## Combination

Valid: [a](../github.md#hello).

Valid: [b](https://github.com/wooorm/test/blob/master/github.md#hello).

Valid: [c](https://github.com/wooorm/test/blob/foo-bar/github.md#hello).

Invalid: [d](../github.md#world).

Invalid: [e](https://github.com/wooorm/test/blob/master/github.md#world).

Invalid: [f](https://github.com/wooorm/test/blob/foo-bar/github.md#world).

Invalid: [g](../world.md#hello).

Invalid: [h](https://github.com/wooorm/test/blob/master/world.md#hello).

Invalid: [i](https://github.com/wooorm/test/blob/foo-bar/world.md#hello).
