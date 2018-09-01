'use strict';

import {window, commands, ExtensionContext} from 'vscode';
import {TestRunner} from './phpunittest';

export function activate(context: ExtensionContext) {

	let outputChannel = window.createOutputChannel("phpunit");
	let PHPUnitTestRunner: TestRunner = new TestRunner(outputChannel);

	context.subscriptions.push(commands.registerCommand('phpunit.Test', () => {
		PHPUnitTestRunner.run('test');
	}));

	context.subscriptions.push(commands.registerCommand('phpunit.TestNearest', () => {
		PHPUnitTestRunner.run('nearest-test');
	}));

	context.subscriptions.push(commands.registerCommand('phpunit.TestDirectory', () => {
		PHPUnitTestRunner.run('directory')
	}));

	context.subscriptions.push(commands.registerCommand('phpunit.RerunLastTest', () => {
		PHPUnitTestRunner.run('rerun-last-test')
	}));
}

// this method is called when your extension is deactivated
export function deactivate() {
}
