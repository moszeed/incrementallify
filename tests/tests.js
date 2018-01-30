(() => {
	'use strict';

	const fs 			= require('fs');
	const path 		 	= require('path');
	const test 		 	= require('tape');
	const browserify 	= require('browserify');
	const incrementally = require('../');

	const outFilePath  = path.join(__dirname, './bundle.js');
	const testFilePath = path.join(__dirname, './a.js');



	test('reset', async (t) => {
		fs.unlinkSync(outFilePath);
		fs.unlinkSync('./browserify-cache.json');
		t.end();
	});

	test('bundle to file', async (t) => {
		let args = Object.assign({}, incrementally.args, {
			outfile: outFilePath,
			verbose: true
		});
		let incr = await incrementally(browserify(testFilePath, args));
		let bundling = incr.bundle();

		let wstream = fs.createWriteStream(outFilePath);
		wstream.on('finish', function(){
			t.end();
		});

		bundling.pipe(wstream);
	});

	test('no bundling', async (t) => {
		let args = Object.assign({}, incrementally.args, {
			outfile: outFilePath,
			verbose: true
		});
		let incr = await incrementally(browserify(testFilePath, args));
		let bundling = incr.bundle();

		let wstream = fs.createWriteStream(outFilePath);
		wstream.on('finish', function(){
			t.end();
		});

		bundling.pipe(wstream);
	});

})();