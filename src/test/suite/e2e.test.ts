import * as assert from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
// import * as myExtension from '../../extension';
import path = require('path');
import { before } from 'mocha';
import * as fs from 'fs';
import { IMyExtensionApi } from '../../MyExtensionApi';

const getOnDidEndTaskProcessPromise = (outputFile: string): Promise<string> => {
  return new Promise<string>((resolve, reject) => {
    const disposable = vscode.tasks.onDidEndTaskProcess(async (e) => {
      if (e.execution.task.source === 'phpunit' && e.execution.task.name === 'run') {
          const output = await fs.promises.readFile(outputFile, 'utf-8');
          disposable.dispose();

          resolve(output);
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
  
	test('phpunit.Test Class', async () => {
    const uri = vscode.Uri.file(path.resolve(vscode.workspace.workspaceFolders![0].uri.fsPath, 'tests/Math/AdditionTest.php'));
    const document = await vscode.workspace.openTextDocument(uri);
    await vscode.window.showTextDocument(document, {
      selection: new vscode.Range(5, 0, 5, 0) // Set the cursor on the class line in the AdditionTest class
    });

    await vscode.workspace.getConfiguration('phpunit').update('preferRunClassTestOverQuickPickWindow', true);

    const taskOutputPromise = getOnDidEndTaskProcessPromise(myExtensionApi.testRedirectedOutputFile);
    const res = await vscode.commands.executeCommand('phpunit.Test');
    const output = await taskOutputPromise;

    assert.match(output as string, /PHPUnit .* by Sebastian Bergmann and contributors./);
    assert.match(output as string, /OK \(\d+ tests?, \d+ assertions?\)/);
	});

	test('phpunit.TestNearest', async () => {
    const uri = vscode.Uri.file(path.resolve(vscode.workspace.workspaceFolders![0].uri.fsPath, 'tests/Math/AdditionTest.php'));
    const document = await vscode.workspace.openTextDocument(uri);
    await vscode.window.showTextDocument(document, {
      selection: new vscode.Range(8, 0, 8, 0) // Set the cursor at the first method in the AdditionTest class
    });

    const taskOutputPromise = getOnDidEndTaskProcessPromise(myExtensionApi.testRedirectedOutputFile);
    const res = await vscode.commands.executeCommand('phpunit.TestNearest');
    const output = await taskOutputPromise;

    assert.match(output as string, /PHPUnit .* by Sebastian Bergmann and contributors./);
    assert.match(output as string, /OK \(\d+ tests?, \d+ assertions?\)/);
	});

	test('phpunit.TestDirectory', async () => {
    const uri = vscode.Uri.file(path.resolve(vscode.workspace.workspaceFolders![0].uri.fsPath, 'tests/Math/AdditionTest.php'));
    const document = await vscode.workspace.openTextDocument(uri);
    await vscode.window.showTextDocument(document);

    const taskOutputPromise = getOnDidEndTaskProcessPromise(myExtensionApi.testRedirectedOutputFile);
    const res = await vscode.commands.executeCommand('phpunit.TestDirectory');
    const output = await taskOutputPromise;

    assert.match(output as string, /PHPUnit .* by Sebastian Bergmann and contributors./);
    assert.match(output as string, /OK \(\d+ tests?, \d+ assertions?\)/);
    assert.ok(parseInt((output as string).match(/OK \((\d+) tests, \d+ assertions\)/)![1]) >= 2);
	});
});
