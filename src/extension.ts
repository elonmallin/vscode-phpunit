'use strict';

import {commands, ExtensionContext} from 'vscode';
import {runTest, runTestDirectory} from './phpunittest';

export function runFile(): void {
	runTest();
}

export function runDir(): void {
	runTestDirectory();
}

export function activate(context: ExtensionContext) {
	context.subscriptions.push(commands.registerCommand('phpunit.Test', runFile));
    context.subscriptions.push(commands.registerCommand('phpunit.TestDirectory', runDir));
}

// this method is called when your extension is deactivated
export function deactivate() {
}