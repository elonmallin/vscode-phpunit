'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
var phpunittest = require('./phpunittest');

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	let disposable = vscode.commands.registerCommand('extension.phpunitTest', phpunittest.runTest);

	context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {
}