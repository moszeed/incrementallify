(() => {
    'use strict';

    const crypto    = require('crypto');
    const path      = require('path');
    const fs        = require('fs');
    const readonly  = require('read-only-stream');
    const promisify = require('util').promisify;
    const fileStat  = promisify(fs.stat);

    const cacheFileFolder = path.join(process.cwd(), '.browserifyCache');
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

    async function incrementallify (browserify, opts = {}) {
        let cache = await Cache();
        let cacheFileData = await cache.getCacheFileData();

        // create cache directory
        await checkIfFileExists(cacheFileFolder, () => {
            fs.mkdirSync(cacheFileFolder);
        });

        const runParams = Object.assign({}, browserify._options, browserify.argv);
        const verbose = runParams.v || runParams.verbose;
        const runCheckSum = createChecksum(runParams);
        const cacheFileFullPath = path.join(cacheFileFolder, runCheckSum);

        browserify.on('file', function (filePath, id, parent) {
            if (!cacheFileData.items[runCheckSum]) {
                cacheFileData.items[runCheckSum] = {};
            }

            Object.assign(cacheFileData.items[runCheckSum], {
                [path.normalize(filePath)]: createChecksum(filePath)
            });
        });

        const _bundle = browserify.bundle;
        browserify.bundle = function (cb) {
            if (fs.existsSync(cacheFileFullPath)) {
                browserify.reset();
                if (verbose) console.log(`[${new Date().toLocaleTimeString()}] use cache`);
                const self = this;
                const stream = fs.createReadStream(cacheFileFullPath);
                const output = readonly(stream);
                if (cb) cb(null, output);

                const ready = () => {
                    self.pipeline.end();
                };

                if (this._pending === 0) ready();
                else this.once('_ready', ready);
                return output;
            }

            var args = (typeof (cb) === 'function') ? [cb] : [];
            return _bundle.apply(browserify, args);
        };

        browserify.on('bundle', function (readStream) {
            const writeCacheStream = fs.createWriteStream(cacheFileFullPath);
            readStream.on('data', (pack) => writeCacheStream.write(pack));
            readStream.on('end', () => writeCacheStream.end());
        });

        browserify.pipeline.get('wrap').on('end', () => {
            cache.saveCacheFileData(cacheFileData);
        });

        return browserify;
    }
})();
