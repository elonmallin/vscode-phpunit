import * as path from 'path';
import * as Mocha from 'mocha';
import { glob } from 'glob';

export async function run(): Promise<void> {
	// Create the mocha test
	const mocha = new Mocha({
		ui: 'tdd',
    timeout: 30000,
    reporter: 'mocha-junit-reporter',
    reporterOptions: {
        mochaFile: path.resolve(__dirname, '../../../..', 'test-results.xml')
    }
	});
 
	const testsRoot = path.resolve(__dirname, '..');

  const files = await glob('**/**.test.js', { cwd: testsRoot });

  // Add files to the test suite
  files.forEach(f => mocha.addFile(path.resolve(testsRoot, f)));

  // Run the mocha test
  return new Promise((resolve, reject) => {
    mocha.run(failures => {
        if (failures > 0) {
            reject(new Error(`${failures} tests failed.`));
        } else {
            resolve();
        }
    });
  });
}
