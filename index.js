(() => {
    'use strict';

    const crypto = require('crypto');
    const path = require('path');
    const browserifyArgs = require('browserify/bin/args');
    const writer = require('through2')();
    const outpipe = require('outpipe');
    const promisify = require('util').promisify;
    const fs = require('fs');
    const readFile = promisify(fs.readFile);
    const fileStat = promisify(fs.stat);
    const writeFile = promisify(fs.writeFile);

    const cacheFilePath = path.resolve(process.cwd(), 'browserify-cache.json');
    const browserify = browserifyArgs(process.argv.slice(2));
    if (browserify.argv.version) {
        console.error(`incrementallify v ${require('./package.json').version} (in ${path.resolve(__dirname, '..')})`);
        console.error(`browserify v ${require('browserify/package.json').version} (in ${path.dirname(require.resolve('browserify'))})`);
        return;
    }

    const verbose = browserify.argv.v || browserify.argv.verbose;
    const outfile = browserify.argv.o || browserify.argv.outfile;
    if (!outfile) {
        console.log('no outfile (-o) defined');
        process.exit(1);
    }

    function createChecksum (data) {
        if (Array.isArray(data) ||
            data === Object(data)) {
            data = JSON.stringify(data);
        }

        return crypto
            .createHash('sha1')
            .update(data, 'utf8')
            .digest('hex');
    }

    function bundleFile () {
        const browserifyBundle = browserify.bundle();
        browserify.pipeline.get('pack').once('readable', function () {
            browserifyBundle.pipe(writer);
        });

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

    async function saveCacheFileData (data = {}) {
        return writeFile(
            cacheFilePath,
            JSON.stringify(data, null, 2),
            'utf8'
        );
    }

    async function getCacheFileData () {
        try {
            await fileStat(cacheFilePath);
        } catch (err) {
            if (err.code !== 'ENOENT') {
                throw Error(err);
            }
            let currentDate = new Date();
            await saveCacheFileData({
                created: currentDate,
                changed: currentDate,
                items  : {}
            });
        }
        return JSON.parse(await readFile(cacheFilePath, 'utf8'));
    }

    async function checkCache () {
        let cacheFileData = await getCacheFileData();

        let fileChecksums = {};

        for (let filePath of browserify._options.entries) {
            let stat = await fileStat(filePath);
            fileChecksums[filePath] = createChecksum(stat);
        }

        const currentRunChecksum = createChecksum(Object.assign({}, browserify._options, browserify.argv));
        const currentRunInCache  = cacheFileData.items[currentRunChecksum];
        if (currentRunInCache) {
            const filePaths  = Object.keys(currentRunInCache);
            for (let filePath of filePaths) {
                if (!fileChecksums[filePath]) {
                    let stat = await fileStat(filePath);
                    fileChecksums[filePath] = createChecksum(stat);
                }
            }

            const skipBundle = filePaths.every((filePath) => fileChecksums[filePath] === currentRunInCache[filePath]);
            if (skipBundle) {
                if (verbose) console.log(`[${new Date().toLocaleTimeString()}] skip ${outfile}`);
                return true;
            }
        }

        browserify.on('dep', async function (row) {
            let depFiles = Object.keys(row.deps);
            if (depFiles.length !== 0) {
                let depFullPaths = depFiles.map((fileName) => path.join(path.dirname(row.file), fileName));
                for (let deepFilePath of depFullPaths) {
                    let stat = await fileStat(deepFilePath);
                    fileChecksums[deepFilePath] = createChecksum(stat);
                }
            }

            cacheFileData.items[currentRunChecksum] = fileChecksums;
            await saveCacheFileData(cacheFileData);
        });

        bundleFile();
    }

    checkCache();
})();
