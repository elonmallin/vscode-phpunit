import { Range, TestController, TestItem, TestItemCollection, Uri, workspace } from "vscode";
import * as path from "path";
import { TestFileParser } from "../TestFileParser";
import { TestClass } from "./TestClass";
import { TestMethod } from "./TestMethod";
import { TestDirectory } from "./TestDirectory";
import { TestFile } from "./TestFile";
import { TestCaseNode } from "./TestCaseNode";
import { ITestCase } from "./ITestCase";

export const testData = new WeakMap<TestItem, ITestCase>();

export function gatherTestItems(collection: TestItemCollection) {
	const items: TestItem[] = [];
	collection.forEach(item => items.push(item));

	return items;
}

async function getOrCreateFromTestCaseNodes(controller: TestController, uri: Uri, testCaseNodes: Array<TestCaseNode>, parentItemCollecton: TestItemCollection): Promise<TestItem[]> {
  for (const testCaseNode of testCaseNodes) {
    if (testCaseNode.kind === 'namespace') {
      if (testCaseNode.children?.length > 0) {
        await getOrCreateFromTestCaseNodes(controller, uri, testCaseNode.children, parentItemCollecton);
      }
    }
    else if (testCaseNode.kind === 'class') {
      const testCase = new TestClass(uri.fsPath, testCaseNode.name, testCaseNode.range, testCaseNode.parent?.name);
      let testItem = parentItemCollecton.get(testCase.getId());
      if (!testItem) {
        testItem = controller.createTestItem(testCase.getId(), testCase.getLabel(), uri);
        testData.set(testItem, testCase);
        testItem.range = testCase.getRange();
        testItem.description = 'class';
        parentItemCollecton.add(testItem);
      }
      else {
        testItem.range = testCase.getRange();
      }

      if (testCaseNode.children?.length > 0) {
        await getOrCreateFromTestCaseNodes(controller, uri, testCaseNode.children, testItem.children);
      }
    }
    else if (testCaseNode.kind === 'method') {
      const testCase = new TestMethod(uri.fsPath, testCaseNode.name, testCaseNode.range, testCaseNode.parent?.name, testCaseNode.parent?.parent?.name);
      let testItem = parentItemCollecton.get(testCase.getId());
      if (!testItem) {
        testItem = controller.createTestItem(testCase.getId(), testCase.getLabel(), uri);
        testData.set(testItem, testCase);
        testItem.description = 'method';
        testItem.range = testCase.getRange();
        parentItemCollecton.add(testItem);
      }
      else {
        testItem.range = testCase.getRange();
      }
    }
  }

  return gatherTestItems(parentItemCollecton);
}

export async function deleteFromUri(controller: TestController, testItemCollection: TestItemCollection, uri: Uri) {
  if (uri.scheme !== 'file') {
    return;
  }

  const item = testItemCollection.get(uri.fsPath);
  if (item) {
    controller.invalidateTestResults(item);
    testItemCollection.delete(item.id);
    deleteFromTestData(item);
  }

  testItemCollection.forEach(item => {
    if (item.children) {
      deleteFromUri(controller, item.children, uri);
    }
  });
}

function deleteFromTestData(testItem: TestItem) {
  testData.delete(testItem);

  if (testItem.children) {
    testItem.children.forEach(child => deleteFromTestData(child));
  }
}

export async function createOrUpdateFromPath(controller: TestController, filePath: string, commonDirectory: string) {
  const pathParts = filePath.replace(commonDirectory, '').split(/[/\\]+/i);
  const paths: string[] = [];
  let currentPath = commonDirectory;
  for (const part of pathParts) {
    currentPath = path.join(currentPath, part);
    paths.push(currentPath);
  }

  createOrUpdateItem(controller, controller.items, paths);
}

async function createOrUpdateItem(controller: TestController, parentItemCollecton: TestItemCollection, paths: string[]) {
  const currentPath = paths.shift();
  if (!currentPath) {
    return;
  }

  const item = parentItemCollecton.get(currentPath);
  if (item) {
    createOrUpdateItem(controller, item.children, paths);

    return;
  }

  if (currentPath.endsWith('.php')) {
    const testCase = new TestFile(currentPath);
    const testItem = controller.createTestItem(testCase.getId(), testCase.getLabel(), pathToUri(currentPath));
    testItem.canResolveChildren = true;
  
    parentItemCollecton.add(testItem);
    testData.set(testItem, testCase);
  
    const currentUri = pathToUri(currentPath);
    const rawContent = await workspace.fs.readFile(currentUri);
    const content = new TextDecoder('utf-8').decode(rawContent);
    const testCaseNodes = new TestFileParser().parse(content, currentUri);

    await getOrCreateFromTestCaseNodes(controller, currentUri, testCaseNodes, testItem.children);
  }
  else {
    const testCase = new TestDirectory(currentPath);
    const testItem = controller.createTestItem(testCase.getId(), testCase.getLabel(), pathToUri(currentPath));
    testItem.canResolveChildren = true;
  
    parentItemCollecton.add(testItem);
    testData.set(testItem, testCase);
  
    createOrUpdateItem(controller, testItem.children, paths);
  }
}

function pathToUri(path: string) {
  return Uri.parse(`file:///${path.replace(/\\/g, '/').replace(':', '%3A')}`);
}
