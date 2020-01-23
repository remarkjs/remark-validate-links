Here we link to a folder:

Explicit:

[OK](./folder/readme.markdown#this)

[OK](./folder/readme.markdown#that)

[NOK](./folder/readme.markdown#missing)

Implicit:

[OK](./folder#this)

[OK](./folder#that)

[NOK](./folder#missing)

Other:

[NOK](./missing#missing)

[NOK](./folder-without-readme#missing)
