# Links to other branches

- [Same branch, working link](https://github.com/wooorm/test/blob/main/examples/github.md#hello): Nothing to report.
- [Other branch, working link](https://github.com/wooorm/test/blob/foo-bar/examples/github.md#hello): Nothing to ignore.
- [Same branch, no such heading](https://github.com/wooorm/test/blob/main/examples/github.md#world): Should be reported.
- [Other branch, no such heading](https://github.com/wooorm/test/blob/foo-bar/examples/github.md#world): Should be ignored.
- [Same branch, no such file](https://github.com/wooorm/test/blob/main/examples/world.md#hello): Should be reported.
- [Other branch, no such file](https://github.com/wooorm/test/blob/foo-bar/examples/world.md#hello): Should be ignored.
