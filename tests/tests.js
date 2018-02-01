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

    const outFilePath           = path.join(__dirname, 'testBuilds', './bundle.js');
    const outFilePath2          = path.join(__dirname, 'testBuilds', './bundle2.js');
    const outFilePath3          = path.join(__dirname, 'testBuilds', './bundle3.js');
    const outFilePath4          = path.join(__dirname, 'testBuilds', './bundle4.js');
    const outFilePathWithPlugin = path.join(__dirname, 'testBuilds', './bundlePlugin.js');
    const outFilePipe           = `tee ${path.join(__dirname, 'testBuilds', './stream_bundle.js')} > ${path.join(__dirname, 'testBuilds', './stream_bundle2.js')}`;
    const testFilePath          = path.join(__dirname, './a.js');

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

        let delFile4 = fileStat(outFilePath2).then(() => {
            fs.unlinkSync(outFilePath2);
        }).catch((err) => { console.log(err); });

        let delFile5 = fileStat(outFilePath3).then(() => {
            fs.unlinkSync(outFilePath3);
        }).catch((err) => { console.log(err); });

        Promise.all([delFile1, delFile2, delFile3, delFile4, delFile5])
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

    test('bundle to file - with plugins', async (t) => {
        const args = Object.assign({}, incrementally.args, {
            outfile: outFilePathWithPlugin,
            verbose: true
        });
        const incr = await incrementally(browserify(testFilePath, args));
        incr.plugin('common-shakeify', { });
        const bundling = incr.bundle();

        let wstream = fs.createWriteStream(outFilePathWithPlugin);
        wstream.on('finish', function () {
            t.end();
        });

        bundling.pipe(wstream);
    });

    test('bundle to file - with plugins - use cache (1)', async (t) => {
        const args = Object.assign({}, incrementally.args, {
            outfile: outFilePathWithPlugin,
            verbose: true
        });
        const incr = await incrementally(browserify(testFilePath, args));
        incr.plugin('common-shakeify', { });
        const bundling = incr.bundle();

        let wstream = fs.createWriteStream(outFilePathWithPlugin);
        wstream.on('finish', function () {
            t.end();
        });

        bundling.pipe(wstream);
    });

    test('bundle to file - with plugins - use cache (2)', async (t) => {
        const args = Object.assign({}, incrementally.args, {
            outfile: outFilePathWithPlugin,
            verbose: true
        });
        const incr = await incrementally(browserify(testFilePath, args));
        incr.plugin('common-shakeify', { });
        const bundling = incr.bundle();

        let wstream = fs.createWriteStream(outFilePathWithPlugin);
        wstream.on('finish', function () {
            t.end();
        });

        bundling.pipe(wstream);
    });

    test('bundle to pipe - with plugins', async (t) => {
        const args = Object.assign({}, incrementally.args, {
            outfile: outFilePipe,
            verbose: true
        });
        const incr = await incrementally(browserify(testFilePath, args));
        incr.plugin('common-shakeify', { });
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

    test('bundle to pipe - with plugins - use cache (1)', async (t) => {
        const args = Object.assign({}, incrementally.args, {
            outfile: outFilePipe,
            verbose: true
        });
        const incr = await incrementally(browserify(testFilePath, args));
        incr.plugin('common-shakeify', { });
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

    test('bundle to pipe - with plugins - use cache (2)', async (t) => {
        const args = Object.assign({}, incrementally.args, {
            outfile: outFilePipe,
            verbose: true
        });
        const incr = await incrementally(browserify(testFilePath, args));
        incr.plugin('common-shakeify', { });
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

    test('bundle to file - multiple paralell', async (t) => {
        t.plan(3);
        let args = Object.assign({}, incrementally.args, {
            outfile: outFilePath,
            verbose: true
        });
        let incr = await incrementally(browserify(testFilePath, args));

        let args2 = Object.assign({}, incrementally.args, {
            outfile: outFilePath2,
            verbose: true
        });
        let incr2 = await incrementally(browserify(testFilePath, args2));

        let args3 = Object.assign({}, incrementally.args, {
            outfile: outFilePath3,
            verbose: true
        });
        let incr3 = await incrementally(browserify(testFilePath, args3));

        let bundling  = incr.bundle();
        let bundling2 = incr2.bundle();
        let bundling3 = incr3.bundle();

        let wstream = fs.createWriteStream(outFilePath);
        wstream.on('finish', function () {
            t.ok(true);
        });

        bundling.pipe(wstream);

        let wstream2 = fs.createWriteStream(outFilePath2);
        wstream2.on('finish', function () {
            t.ok(true);
        });

        bundling2.pipe(wstream2);

        let wstream3 = fs.createWriteStream(outFilePath3);
        wstream3.on('finish', function () {
            t.ok(true);
        });

        bundling3.pipe(wstream3);
    });

})();
