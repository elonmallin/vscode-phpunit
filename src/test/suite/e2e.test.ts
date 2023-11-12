import * as assert from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
// import * as myExtension from '../../extension';
import path = require('path');
import { before, beforeEach } from 'mocha';
import * as fs from 'fs';
import { IMyExtensionApi } from '../../MyExtensionApi';
import * as sinon from 'sinon';

const getOnDidEndTaskProcessPromise = (outputFile: string): Promise<{ output: string, exitCode: number }> => {
  return new Promise<{ output: string, exitCode: number }>((resolve, reject) => {
    const disposable = vscode.tasks.onDidEndTaskProcess(async (e) => {
      if (e.execution.task.source === 'phpunit' && e.execution.task.name === 'run') {
          const output = await fs.promises.readFile(outputFile, 'utf-8');
          disposable.dispose();

          resolve({ output, exitCode: e.exitCode === undefined ? 1 : e.exitCode });
      }
    });
  });
};

let myExtensionApi: IMyExtensionApi;

suite('php-project e2e', () => {

  before(async () => {
    const ext = vscode.extensions.getExtension('emallin.phpunit');
    myExtensionApi = await ext?.activate() as IMyExtensionApi;
  });

  beforeEach(async () => {
    sinon.restore();
  });
  
	test('phpunit.Test Class', async () => {
    const uri = vscode.Uri.file(path.resolve(vscode.workspace.workspaceFolders![0].uri.fsPath, 'tests/Math/AdditionTest.php'));
    const document = await vscode.workspace.openTextDocument(uri);
    await vscode.window.showTextDocument(document, {
      selection: new vscode.Range(5, 0, 5, 0) // Set the cursor on the class line in the AdditionTest class
    });

    await vscode.workspace.getConfiguration('phpunit').update('preferRunClassTestOverQuickPickWindow', true);

    const taskOutputPromise = getOnDidEndTaskProcessPromise(myExtensionApi.testRedirectedOutputFile);
    const res = await vscode.commands.executeCommand('phpunit.Test');
    const task = await taskOutputPromise;

    assert.match(task.output, /PHPUnit .* by Sebastian Bergmann and contributors./);
    assert.equal(task.exitCode, 0);
	});

	test('phpunit.Test Function', async () => {
    const uri = vscode.Uri.file(path.resolve(vscode.workspace.workspaceFolders![0].uri.fsPath, 'tests/Math/AdditionTest.php'));
    const document = await vscode.workspace.openTextDocument(uri);
    await vscode.window.showTextDocument(document, {
      selection: new vscode.Range(6, 20, 6, 27) // Select the first function name in AdditionTest
    });

    const taskOutputPromise = getOnDidEndTaskProcessPromise(myExtensionApi.testRedirectedOutputFile);
    const res = await vscode.commands.executeCommand('phpunit.Test');
    const task = await taskOutputPromise;

    assert.match(task.output, /PHPUnit .* by Sebastian Bergmann and contributors./);
    assert.equal(task.exitCode, 0);
	});

	test('phpunit.Test suite', async () => {
    const uri = vscode.Uri.file(path.resolve(vscode.workspace.workspaceFolders![0].uri.fsPath, 'phpunit.xml'));
    const document = await vscode.workspace.openTextDocument(uri);
    await vscode.window.showTextDocument(document, {
      selection: new vscode.Range(12, 0, 12, 0) // Set the cursor at the line with the Science test suite
    });

    const stub = sinon.stub(vscode.window, 'showQuickPick');
    stub.returns(Promise.resolve('Science' as any));

    const taskOutputPromise = getOnDidEndTaskProcessPromise(myExtensionApi.testRedirectedOutputFile);
    const res = await vscode.commands.executeCommand('phpunit.Test');
    const task = await taskOutputPromise;

    assert.match(task.output, /PHPUnit .* by Sebastian Bergmann and contributors./);
    assert.equal(task.exitCode, 0);
	});

	test('phpunit.TestNearest', async () => {
    const uri = vscode.Uri.file(path.resolve(vscode.workspace.workspaceFolders![0].uri.fsPath, 'tests/Math/AdditionTest.php'));
    const document = await vscode.workspace.openTextDocument(uri);
    await vscode.window.showTextDocument(document, {
      selection: new vscode.Range(8, 0, 8, 0) // Set the cursor at the first method in the AdditionTest class
    });

    const taskOutputPromise = getOnDidEndTaskProcessPromise(myExtensionApi.testRedirectedOutputFile);
    const res = await vscode.commands.executeCommand('phpunit.TestNearest');
    const task = await taskOutputPromise;

    assert.match(task.output, /PHPUnit .* by Sebastian Bergmann and contributors./);
    assert.equal(task.exitCode, 0);
	});

	test('phpunit.TestDirectory', async () => {
    const uri = vscode.Uri.file(path.resolve(vscode.workspace.workspaceFolders![0].uri.fsPath, 'tests/Math/AdditionTest.php'));
    const document = await vscode.workspace.openTextDocument(uri);
    await vscode.window.showTextDocument(document);

    const taskOutputPromise = getOnDidEndTaskProcessPromise(myExtensionApi.testRedirectedOutputFile);
    const res = await vscode.commands.executeCommand('phpunit.TestDirectory');
    const task = await taskOutputPromise;

    assert.match(task.output, /PHPUnit .* by Sebastian Bergmann and contributors./);
    assert.equal(task.exitCode, 0);
    assert.ok(parseInt((task.output).match(/(\d+) \/ \d+ \(100%\)/)![1]) >= 2);
	});

	test('phpunit.TestSuite', async () => {
    const uri = vscode.Uri.file(path.resolve(vscode.workspace.workspaceFolders![0].uri.fsPath, 'phpunit.xml'));
    const document = await vscode.workspace.openTextDocument(uri);
    await vscode.window.showTextDocument(document, {
      selection: new vscode.Range(12, 0, 12, 0) // Set the cursor at the line with the Science test suite
    });

    const stub = sinon.stub(vscode.window, 'showQuickPick');
    stub.returns(Promise.resolve('Science' as any));

    const taskOutputPromise = getOnDidEndTaskProcessPromise(myExtensionApi.testRedirectedOutputFile);
    const res = await vscode.commands.executeCommand('phpunit.TestSuite');
    const task = await taskOutputPromise;

    assert.match(task.output, /PHPUnit .* by Sebastian Bergmann and contributors./);
    assert.equal(task.exitCode, 0);
	});
});
