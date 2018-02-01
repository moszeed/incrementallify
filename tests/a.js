(() => {
    const outpipe = require('outpipe');
    const b = require('./b.js');
    b.b();
    console.log(`a`);
})();
