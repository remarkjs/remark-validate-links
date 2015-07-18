# Hello

This is a valid relative heading [link](#hello).

This is an invalid relative heading [link](#world).

## Files

This is a valid relative file [link](https://github.com/wooorm/test/blob/master/example.md).

So is this [link](https://github.com/wooorm/test/blob/foo-bar/example.md).

And this [link](../example.md).

This is an invalid relative file [link](https://github.com/wooorm/test/blob/master/world.md).

So is this [link](https://github.com/wooorm/test/blob/foo-bar/world.md).

And this [link](../world.md).

## Combination

Valid: [a](../example.md#hello).

Valid: [b](https://github.com/wooorm/test/blob/master/example.md#hello).

Valid: [c](https://github.com/wooorm/test/blob/foo-bar/example.md#hello).

Invalid: [d](../example.md#world).

Invalid: [e](https://github.com/wooorm/test/blob/master/example.md#world).

Invalid: [f](https://github.com/wooorm/test/blob/foo-bar/example.md#world).

Invalid: [g](../world.md#hello).

Invalid: [h](https://github.com/wooorm/test/blob/master/world.md#hello).

Invalid: [i](https://github.com/wooorm/test/blob/foo-bar/world.md#hello).
