# incrementallify
a way to faster builds with browserify

Rebuild only if something has changed, otherwise returns already build file.
Incrementallify will create a browserify-cache.json in the current working directory.

## example
you can use `incrementallify` with all the `browserify` arguments

    $ incrementallify -o output/bundle.js ./sourcefile.js --verbose
    [09:28:47] written to bundle.js



## install

to install with [npm](https://npmjs.org):

```
$ npm install -g incrementallify

```

to get the incrementallify cli, or do:

```
$ npm install --save incrementallify

```
to get the libary instead
