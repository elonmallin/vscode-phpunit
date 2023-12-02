import { TestController, TestItem, TestItemCollection, Uri, workspace } from "vscode";
import { testData } from "../TestExplorerFeature";
import * as path from "path";
import * as fs from 'fs';
import * as util from 'util';
import { ParsePhpunitTestFile } from "../PhpunitTestFileParser";
import { TestClass } from "./TestClass";
import { TestMethod } from "./TestMethod";
import { TestDirectory } from "./TestDirectory";

const readdir = util.promisify(fs.readdir);

export async function getOrCreate(controller: TestController, uri: Uri, parentItemCollecton?: TestItemCollection): Promise<TestItem[]> {
  if (uri.fsPath.endsWith('.php')) {
    return await getOrCreateFromFile(controller, uri, parentItemCollecton);
  }
  else {
    return await getOrCreateFromDirectory(controller, uri, parentItemCollecton);
  }
}

async function getOrCreateFromDirectory(controller: TestController, uri: Uri, parentItemCollecton?: TestItemCollection): Promise<TestItem[]> {
  const existing = parentItemCollecton?.get(uri.toString());
  if (existing) {
    return [existing];
  }

  if (parentItemCollecton) {
    const testCase = new TestDirectory(uri.fsPath);
    const testItem = controller.createTestItem(testCase.getId(), testCase.getLabel(), uri);
    testItem.canResolveChildren = true;

    parentItemCollecton.add(testItem);
    testData.set(testItem, testCase);

    // New parent for next recursion
    parentItemCollecton = testItem.children;
  }

  const dirents = await readdir(uri.fsPath, { withFileTypes: true });

  const testItems: TestItem[] = [];
  for (const dirent of dirents) {
    const childUri = Uri.parse(`file:///${path.join(uri.fsPath, dirent.name)}`);

    testItems.push(...(await getOrCreate(controller, childUri, parentItemCollecton || controller.items)));
  }

  return testItems;
}

async function getOrCreateFromFile(controller: TestController, uri: Uri, parentItemCollecton?: TestItemCollection): Promise<TestItem[]> {
  const existing = parentItemCollecton?.get(uri.toString());
  if (existing) {
    return [existing];
  }

  const rawContent = await workspace.fs.readFile(uri);
  const content = new TextDecoder('utf-8').decode(rawContent);
  const testCases = new ParsePhpunitTestFile().parsePhpunitTestFile(content, uri);

  const testCaseClass = testCases.find(testCase => testCase instanceof TestClass)!;
  const testItemClass = controller.createTestItem(testCaseClass.getId(), testCaseClass.getLabel(), uri);
  testData.set(testItemClass, testCaseClass);
  testItemClass.range = testCaseClass.getRange();
  (parentItemCollecton || controller.items).add(testItemClass);

  parentItemCollecton = testItemClass.children;

  for (const testCase of testCases.filter(testCase => testCase instanceof TestMethod)) {
    const testItem = controller.createTestItem(testCase.getId(), testCase.getLabel(), uri);
    testData.set(testItem, testCase);
    testItem.range = testCase.getRange();

    parentItemCollecton.add(testItem);
  }

  return [testItemClass];
}
