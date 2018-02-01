#!/usr/bin/env node
(async () => {
    'use strict';

    const through = require('through2');
    const outpipe = require('outpipe');
    const path = require('path');
    const incrementallify = require('../');

    const browserifyArgs = require('browserify/bin/args');
    const browserify = await incrementallify(browserifyArgs(process.argv.slice(2)));
    if (browserify.argv.version) {
        console.error(`incrementallify v ${require('../package.json').version} (in ${path.resolve(__dirname, '..')})`);
        console.error(`browserify v ${require('browserify/package.json').version} (in ${path.dirname(require.resolve('browserify'))})`);
        return;
    }

    const verbose = browserify.argv.v || browserify.argv.verbose;
    const outfile = browserify.argv.o || browserify.argv.outfile;
    if (!outfile) {
        console.log('no outfile (-o) defined');
        process.exit(1);
    }

    function bundleFile () {
        const writer = through();
        const browserifyBundle = browserify.bundle();
        browserifyBundle.pipe(writer);

        writer.once('readable', function () {
            var outpipeStream = outpipe(outfile);
            outpipeStream.on('error', function (err) {
                console.error(err);
            });
            outpipeStream.on('exit', function () {
                if (verbose) console.log(`[${new Date().toLocaleTimeString()}] written to ${outfile}`);
            });
            writer.pipe(outpipeStream);
        });
    }

    bundleFile();
})();
