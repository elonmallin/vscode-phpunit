'use strict';

import {window, commands, ExtensionContext} from 'vscode';
import {TestRunner} from './phpunittest';

export function activate(context: ExtensionContext) {

	let outputChannel = window.createOutputChannel("phpunit");
	let PHPUnitTestRunner: TestRunner = new TestRunner(outputChannel);

	context.subscriptions.push(commands.registerCommand('phpunit.Test', () => {
		PHPUnitTestRunner.runTest();
	}));

	context.subscriptions.push(commands.registerCommand('phpunit.TestNearest', () => {
		PHPUnitTestRunner.runNearestTest();
	}));

	context.subscriptions.push(commands.registerCommand('phpunit.TestDirectory', () => {
		PHPUnitTestRunner.runTestDirectory()
	}));

	context.subscriptions.push(commands.registerCommand('phpunit.RerunLastTest', () => {
		PHPUnitTestRunner.rerunLastTest()
	}));
}

// this method is called when your extension is deactivated
export function deactivate() {
}
