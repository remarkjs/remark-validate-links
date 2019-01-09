# Image references

<!-- Valid: -->

Relative ![image](./examples/image.jpg)

No `./` in ![image](examples/image.jpg)

Absolute ![image](https://github.com/wooorm/test/blob/master/examples/image.jpg)

Relative ![image reference][rel]

Absolute ![image reference][abs]

<!-- Invalid: -->

Relative ![missing image](./examples/missing.jpg)

No `./` in ![image](examples/missing.jpg)

Absolute ![missing image](https://github.com/wooorm/test/blob/master/examples/missing.jpg)

Relative ![missing image reference][rel-missing]

Absolute ![missing image reference][abs-missing]

<!-- Definitions: -->

[rel]: ./examples/image.jpg

[abs]: https://github.com/wooorm/test/blob/master/examples/image.jpg

[rel-missing]: ./examples/missing.jpg

[abs-missing]: https://github.com/wooorm/test/blob/master/examples/missing.jpg
