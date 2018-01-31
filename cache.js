(() => {
    'use strict';

    const fs        = require('fs');
    const path      = require('path');
    const promisify = require('util').promisify;
    const readFile  = promisify(fs.readFile);
    const fileStat  = promisify(fs.stat);
    const writeFile = promisify(fs.writeFile);

    const cacheFilePath = path.resolve(process.cwd(), 'browserify-cache.json');

    module.exports = Cache;
    module.exports.clearCache = function () {
        return writeCacheFile({});
    };

    function writeCacheFile (data) {
        return writeFile(cacheFilePath, JSON.stringify(data), 'utf8');
    }

    function Cache () {
        if (!(this instanceof Cache)) return new Cache();
        let self = this;
        return fileStat(cacheFilePath)
            .then(() => self)
            .catch(async (err) => {
                if (err.code !== 'ENOENT') {
                    throw Error(err);
                }
                let currentDate = new Date();
                await writeCacheFile({
                    created: currentDate,
                    changed: currentDate,
                    items  : {}
                });
                return self;
            });
    }

    Cache.prototype.saveCacheFileData = writeCacheFile;

    Cache.prototype.getCacheFileData = function () {
        return readFile(cacheFilePath, 'utf8').then((fileContent) => JSON.parse(fileContent));
    };
})();
