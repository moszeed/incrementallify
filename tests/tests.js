(() => {
    'use strict';

    const promisify     = require('util').promisify;
    const fs            = require('fs');
    const fileStat      = promisify(fs.stat);
    const rimraf        = require('rimraf');
    const through2      = require('through2');
    const path          = require('path');
    const test          = require('tape');
    const outpipe       = require('outpipe');
    const browserify    = require('browserify');
    const incrementally = require('../');

    const outFilePath  = path.join(__dirname, './bundle.js');
    const outFilePipe  = `tee ${path.join(__dirname, './stream_bundle.js')} > ${path.join(__dirname, './stream_bundle2.js')}`;
    const testFilePath = path.join(__dirname, './a.js');

    test('reset', async (t) => {
        let delFile1 = fileStat(outFilePath).then(() => {
            fs.unlinkSync(outFilePath);
        }).catch((err) => { console.log(err); });

        let delFile2 = fileStat('./browserify-cache.json').then(() => {
            fs.unlinkSync('./browserify-cache.json');
        }).catch((err) => { console.log(err); });

        let delFile3 = fileStat('./.browserifyCache/').then(() => {
            rimraf.sync('./.browserifyCache/');
        }).catch((err) => { console.log(err); });

        Promise.all([delFile1, delFile2, delFile3])
            .then(function () {
                t.end();
            });
    });

    test('bundle to file', async (t) => {
        let args = Object.assign({}, incrementally.args, {
            outfile: outFilePath,
            verbose: true
        });
        let incr = await incrementally(browserify(testFilePath, args));
        let bundling = incr.bundle();

        let wstream = fs.createWriteStream(outFilePath);
        wstream.on('finish', function () {
            t.end();
        });

        bundling.pipe(wstream);
    });

    test('bundle to file - use cache (1)', async (t) => {
        let args = Object.assign({}, incrementally.args, {
            outfile: outFilePath,
            verbose: true
        });
        let incr = await incrementally(browserify(testFilePath, args));
        let bundling = incr.bundle();

        let wstream = fs.createWriteStream(outFilePath);
        wstream.on('finish', function () {
            t.end();
        });

        bundling.pipe(wstream);
    });

    test('bundle to file - use cache (2)', async (t) => {
        let args = Object.assign({}, incrementally.args, {
            outfile: outFilePath,
            verbose: true
        });
        let incr = await incrementally(browserify(testFilePath, args));
        let bundling = incr.bundle();

        let wstream = fs.createWriteStream(outFilePath);
        wstream.on('finish', function () {
            t.end();
        });

        bundling.pipe(wstream);
    });

    test('bundle to pipe', async (t) => {
        const args = Object.assign({}, incrementally.args, {
            outfile: outFilePipe,
            verbose: true
        });
        const incr = await incrementally(browserify(testFilePath, args));
        const bundling = incr.bundle();

        const writer = through2();
        incr.pipeline.get('pack').once('readable', function () {
            bundling.pipe(writer);
        });

        writer.once('readable', function () {
            const outpipeStream = outpipe(outFilePipe);
            outpipeStream.on('error', t.end);
            outpipeStream.on('exit', function () {
                t.end();
            });
            writer.pipe(outpipeStream);
        });
    });

    test('bundle to pipe - use cache (1)', async (t) => {
        const args = Object.assign({}, incrementally.args, {
            outfile: outFilePipe,
            verbose: true
        });
        const incr = await incrementally(browserify(testFilePath, args));
        const bundling = incr.bundle();

        const writer = through2();
        incr.pipeline.get('pack').once('readable', function () {
            bundling.pipe(writer);
        });

        writer.once('readable', function () {
            const outpipeStream = outpipe(outFilePipe);
            outpipeStream.on('error', t.end);
            outpipeStream.on('exit', function () {
                t.end();
            });
            writer.pipe(outpipeStream);
        });
    });

    test('bundle to pipe - use cache (2)', async (t) => {
        const args = Object.assign({}, incrementally.args, {
            outfile: outFilePipe,
            verbose: true
        });
        const incr = await incrementally(browserify(testFilePath, args));
        const bundling = incr.bundle();

        const writer = through2();
        incr.pipeline.get('pack').once('readable', function () {
            bundling.pipe(writer);
        });

        writer.once('readable', function () {
            const outpipeStream = outpipe(outFilePipe);
            outpipeStream.on('error', t.end);
            outpipeStream.on('exit', function () {
                t.end();
            });
            writer.pipe(outpipeStream);
        });
    });
})();
