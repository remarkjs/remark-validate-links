# Hello

This is a valid relative heading [link](#hello).

This is an invalid relative heading [link](#world).

## Files

This is a valid relative file [link](https://gitlab.com/wooorm/test/blob/main/gitlab.md).

So is this [link](https://gitlab.com/wooorm/test/blob/foo-bar/gitlab.md).

And this [link](../gitlab.md).

This is an invalid relative file [link](https://gitlab.com/wooorm/test/blob/main/world.md).

So is this [link](https://gitlab.com/wooorm/test/blob/foo-bar/world.md).

And this [link](../world.md).

## Combination

Valid: [a](../gitlab.md#hello).

Valid: [b](https://gitlab.com/wooorm/test/blob/main/gitlab.md#hello).

Valid: [c](https://gitlab.com/wooorm/test/blob/foo-bar/gitlab.md#hello).

Invalid: [d](../gitlab.md#world).

Invalid: [e](https://gitlab.com/wooorm/test/blob/main/gitlab.md#world).

Invalid: [f](https://gitlab.com/wooorm/test/blob/foo-bar/gitlab.md#world).

Invalid: [g](../world.md#hello).

Invalid: [h](https://gitlab.com/wooorm/test/blob/main/world.md#hello).

Invalid: [i](https://gitlab.com/wooorm/test/blob/foo-bar/world.md#hello).
