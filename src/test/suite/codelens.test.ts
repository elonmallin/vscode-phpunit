import * as assert from "assert";

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from "vscode";
// import * as myExtension from '../../extension';
import * as path from "path";
import { PhpCodeLensProvider } from "../../CodeLens/PhpCodeLensProvider";
import { PhpunitXmlCodeLensProvider } from "../../CodeLens/PhpunitXmlCodeLensProvider";
import { PhpunitArgBuilder } from "../../PhpunitCommand/PhpunitArgBuilder";

suite("CodeLens Test Suite", () => {
  test("Test AdditionTest.php", async () => {
    const uri = vscode.Uri.file(
      path.resolve(
        vscode.workspace.workspaceFolders![0].uri.fsPath,
        "tests/Math/AdditionTest.php",
      ),
    );
    const document = await vscode.workspace.openTextDocument(uri);
    const codeLensProvider = new PhpCodeLensProvider();
    const codeLenses = await codeLensProvider.provideCodeLenses(
      document,
      new vscode.CancellationTokenSource().token,
    );

    assert.equal(codeLenses.length, 2);

    assert.equal(codeLenses[0].command?.command, "phpunit.Test");
    assert.equal(codeLenses[0].command?.title, "Run test");
    assert.match(
      (codeLenses[0].command?.arguments?.[0] as PhpunitArgBuilder).build(),
      /--filter .?testAdd.?/i,
    );

    assert.equal(codeLenses[1].command?.command, "phpunit.Test");
    assert.equal(codeLenses[1].command?.title, "Run tests");
    assert.match(
      (codeLenses[1].command?.arguments?.[0] as PhpunitArgBuilder).build(),
      /--filter .?AdditionTest.?/i,
    );
  });

  test("Test phpunit.xml", async () => {
    const uri = vscode.Uri.file(
      path.resolve(
        vscode.workspace.workspaceFolders![0].uri.fsPath,
        "phpunit.xml",
      ),
    );
    const document = await vscode.workspace.openTextDocument(uri);
    const codeLensProvider = new PhpunitXmlCodeLensProvider();
    const codeLenses = await codeLensProvider.provideCodeLenses(
      document,
      new vscode.CancellationTokenSource().token,
    );

    assert.equal(codeLenses.length, 3);

    assert.equal(codeLenses[0].command?.command, "phpunit.Test");
    assert.equal(codeLenses[0].command?.title, "Run test");
    assert.match(
      (codeLenses[0].command?.arguments?.[0] as PhpunitArgBuilder).build(),
      /--testsuite Math/i,
    );

    assert.equal(codeLenses[1].command?.command, "phpunit.Test");
    assert.equal(codeLenses[1].command?.title, "Run test");
    assert.match(
      (codeLenses[1].command?.arguments?.[0] as PhpunitArgBuilder).build(),
      /--testsuite Science/i,
    );

    assert.equal(codeLenses[2].command?.command, "phpunit.Test");
    assert.equal(codeLenses[2].command?.title, "Run tests");
    assert.match(
      (codeLenses[2].command?.arguments?.[0] as PhpunitArgBuilder).build(),
      /--configuration .*phpunit.xml/i,
    );
  });
});
