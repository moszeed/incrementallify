(() => {
    'use strict';

    const crypto     = require('crypto');
    const parse      = require('shell-quote').parse;
    const path       = require('path');
    const fs         = require('fs');
    const through    = require('through2');
    const readonly   = require('read-only-stream');
    const promisify  = require('util').promisify;
    const fileStat   = promisify(fs.stat);

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

    async function checkIfFileExists (filePath, notExistCallback) {
        try {
            await fileStat(filePath);
        } catch (err) {
            if (err.code !== 'ENOENT') {
                throw Error(err);
            }
            notExistCallback();
        }
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
        const verbose = browserify._options.verbose || browserify.argv.verbose;
        const outfile = browserify._options.outfile || browserify.argv.outfile;
        if (!outfile) {
            throw Error('no outfile given');
        }

        const cacheFileFolder = path.join(process.cwd(), '.browserifyCache');
        const outfileIsShell  = parse(outfile).length !== 1;

        let cache = await Cache();
        let cacheFileData = await cache.getCacheFileData();

        browserify.on('dep', async function (row) {
            let depFiles = Object.keys(row.deps);
            if (depFiles.length !== 0) {
                const runParams = Object.assign({}, browserify._options, browserify.argv);
                const runCheckSum = createChecksum(runParams);

                if (!cacheFileData.items[runCheckSum]) cacheFileData.items[runCheckSum] = {};

                const depFullPaths = depFiles
                    .filter((fileName) => path.extname(fileName))
                    .map((fileName) => path.join(path.dirname(row.file), fileName))
                    .filter((filePath) => !cacheFileData.items[runCheckSum][filePath]);

                if (depFullPaths.length === 0) {
                    return true;
                }

                const depFileChecksums = await createChecksumOfArray(depFullPaths);
                cacheFileData.items[runCheckSum] = depFileChecksums;

                await cache.saveCacheFileData(cacheFileData);
            }
        });

        const runParams = Object.assign({}, browserify._options, browserify.argv);
        const runCheckSum = createChecksum(runParams);
        const currentRunInCache = cacheFileData.items[runCheckSum];
        if (currentRunInCache) {
            const filePathsInCache = Object.keys(currentRunInCache);
            const checkSumsOfAvailableFiles = await createChecksumOfArray([
                ...browserify._options.entries,
                ...filePathsInCache
            ]);

            const skipBundle = filePathsInCache.every((filePath) => checkSumsOfAvailableFiles[filePath] === currentRunInCache[filePath]);
            if (skipBundle) {
                if (verbose) console.error(`[${new Date().toLocaleTimeString()}] no bundling, use cache: '${outfile}'`);

                let outfileToUse = outfile;
                if (outfileIsShell) {
                    outfileToUse = path.join(cacheFileFolder, createChecksum(outfile));
                }

                try {
                    await fileStat(outfileToUse);
                    browserify.bundle = function (cb) {
                        var self = this;
                        let stream = through();
                        stream.end(fs.readFileSync(outfileToUse, 'utf8'));
                        let output = readonly(stream);
                        if (cb) cb(null, output);

                        function ready () {
                            self.emit('bundle', output);
                            self.pipeline.end();
                        }

                        if (this._pending === 0) ready();
                        else this.once('_ready', ready);

                        return output;
                    };
                } catch (err) {
                    if (verbose) console.error(`[${new Date().toLocaleTimeString()}] no cache file, bundling: '${outfile}'`);
                }

                return browserify;
            }
        }

        browserify.on('bundle', async function (readStream) {
            if (outfileIsShell) {
                await checkIfFileExists(cacheFileFolder, () => {
                    fs.mkdirSync(cacheFileFolder);
                });

                const cacheFileName = path.join(cacheFileFolder, createChecksum(outfile));
                readStream.pipe(fs.createWriteStream(cacheFileName));
            }
        });

        if (verbose) console.error(`[${new Date().toLocaleTimeString()}] bundling: '${outfile}'`);
        return browserify;
    }
})();
