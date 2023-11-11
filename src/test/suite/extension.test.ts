import * as assert from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
// import * as myExtension from '../../extension';
// import { Workbench } from 'vscode-extension-tester';
import { TestRunner } from '../../phpunittest';
import path = require('path');

suite('Extension Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');

	test('Sample test', () => {
		assert.strictEqual([1, 2, 3].indexOf(5), -1);
		assert.strictEqual([1, 2, 3].indexOf(0), -1);
	});
});

suite('php-project tests', () => {

	test('test addition', async () => {
    const ext = vscode.extensions.getExtension('emallin.phpunit');
    const testRunner = (await ext?.activate()) as TestRunner;

    const uri = vscode.Uri.file(path.resolve(vscode.workspace.workspaceFolders![0].uri.fsPath, 'tests/Math/AdditionTest.php'));
    const document = await vscode.workspace.openTextDocument(uri);
    await vscode.window.showTextDocument(document);

    const res = await vscode.commands.executeCommand('phpunit.Test');
    
    // TODO: Debugging tests will show the full phpunit.Test command output after you manually interact and pick which function should be tested in the extension host.
    await new Promise(resolve => setTimeout(resolve, 10000));
    // const workbench = new Workbench();
    // const outputView = await workbench.getBottomBar().openOutputView();
    // const currentChannel = await outputView.getCurrentChannel();
    // assert.strictEqual(currentChannel, 'phpunit');
    // const outputText = await outputView.getText();
    // assert.match(outputText, /PHPUnit .* by Sebastian Bergmann and contributors./);
	});
});
