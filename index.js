(() => {
    'use strict';

    const crypto    = require('crypto');
    const path      = require('path');
    const fs        = require('fs');
    const through   = require('through2');
    const readonly  = require('read-only-stream');
    const promisify = require('util').promisify;
    const fileStat  = promisify(fs.stat);

    const Cache = require('./cache.js');

    module.exports = incrementallify;
    module.exports.args = {
        cache       : {},
        packageCache: {}
    };

    function createChecksum (data) {
        if (Array.isArray(data) ||
            data === Object(data)) {
            data = JSON.stringify(data);
        }

        return crypto.createHash('sha1').update(data, 'utf8').digest('hex');
    }

    async function createChecksumOfArray (fileArray = []) {
        let checksums = {};
        for (let filePath of fileArray) {
            let stat = await fileStat(filePath);
            checksums[filePath] = createChecksum(stat);
        }
        return checksums;
    }

    async function incrementallify (browserify, opts = {}) {
        let cache = await Cache();

        let cacheFileData = await cache.getCacheFileData();
        let fileChecksums = await createChecksumOfArray(browserify._options.entries);

        const outfile = browserify._options.outfile || browserify.argv.outfile;
        const verbose = browserify._options.verbose || browserify.argv.verbose;

        const runParams = Object.assign({}, browserify._options, browserify.argv);
        const runCheckSum = createChecksum(runParams);

        browserify.on('dep', async function (row) {
            let depFiles = Object.keys(row.deps);
            if (depFiles.length !== 0) {
                const depFullPaths = depFiles.map((fileName) => path.join(path.dirname(row.file), fileName));
                const depFileChecksums = await createChecksumOfArray(depFullPaths);
                fileChecksums = Object.assign({}, fileChecksums, depFileChecksums);
            }
            cacheFileData.items[runCheckSum] = fileChecksums;
            await cache.saveCacheFileData(cacheFileData);
        });

        const currentRunInCache  = cacheFileData.items[runCheckSum];
        if (currentRunInCache) {
            const filePaths  = Object.keys(currentRunInCache);
            const cacheFileChecksums = await createChecksumOfArray(filePaths);
            fileChecksums = Object.assign({}, fileChecksums, cacheFileChecksums);

            const skipBundle = filePaths.every((filePath) => fileChecksums[filePath] === currentRunInCache[filePath]);
            if (skipBundle) {
                if (verbose) console.error(`[${new Date().toLocaleTimeString()}] from cache -> '${outfile}'`);

                try {
                    await fileStat(outfile);

                    browserify.reset();
                    browserify.bundle = function (cb) {
                        let stream = through();
                        stream.end(fs.readFileSync(outfile, 'utf8'));
                        let output =  readonly(stream);
                        if (cb) cb(null, output);
                        return output;
                    };
                } catch (err) {
                    if (verbose) console.error(`[${new Date().toLocaleTimeString()}] no cache file, rebuild -> '${outfile}'`);
                }

                return browserify;
            }
        }

        return browserify;
    }
})();
