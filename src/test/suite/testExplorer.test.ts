import * as assert from "assert";
import * as vscode from "vscode";
import * as path from "path";
import { TestExplorerFeature } from "../../TestProvider/TestExplorerFeature";
import * as fs from "fs";

suite("Test Explorer Test Suite", () => {
  test("Test find all test files and build tree", async () => {
    const testController = vscode.tests.createTestController(
      "phpunitTestController",
      "Phpunit",
    );
    const testExplorer = new TestExplorerFeature(testController);
    await testController.resolveHandler!(undefined);

    type MockTestItem = { label: string; children: Array<MockTestItem> };
    async function buildDirectoryTree(
      dir: string,
      parent: MockTestItem,
    ): Promise<void> {
      const dirents = await fs.promises.readdir(dir, { withFileTypes: true });

      for (const dirent of dirents) {
        const res = path.resolve(dir, dirent.name);
        const testItem = { label: dirent.name, children: [] };
        parent.children.push(testItem);

        if (dirent.isDirectory()) {
          await buildDirectoryTree(res, testItem);
        }
      }
    }

    const root = { label: "root", children: [] };
    const tree = await buildDirectoryTree(
      path.join(vscode.workspace.workspaceFolders![0].uri.fsPath, "tests"),
      root,
    );

    function checkLabelsExistInTestItems(
      item: MockTestItem,
      testItems: vscode.TestItem[],
    ): void {
      const matchingTestItem = testItems.find(
        (testItem) => testItem.label === item.label,
      );
      assert(matchingTestItem, `Label ${item.label} does not exist`);

      for (const child of item.children) {
        checkLabelsExistInTestItems(
          child,
          gatherTestItems(matchingTestItem.children),
        );
      }
    }

    for (const child of root.children) {
      checkLabelsExistInTestItems(child, gatherTestItems(testController.items));
    }
  });
});

function gatherTestItems(collection: vscode.TestItemCollection) {
  const items: vscode.TestItem[] = [];
  collection.forEach((item) => items.push(item));

  return items;
}

// beforeEach(async () => {
//   testController = vscode.tests.createTestController("phpunitTestController", "Phpunit");
//   testExplorer = new TestExplorerFeature(testController);
// });
// afterEach(async () => {
//   testController.dispose();
// });
