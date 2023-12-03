import { TestController, TestItem, TestItemCollection, Uri, workspace } from "vscode";
import * as path from "path";
import * as fs from 'fs';
import * as util from 'util';
import { TestFileParser } from "../TestFileParser";
import { TestClass } from "./TestClass";
import { TestMethod } from "./TestMethod";
import { TestDirectory } from "./TestDirectory";
import { TestFile } from "./TestFile";
import { TestCaseNode } from "./TestCaseNode";
import { ITestCase } from "./ITestCase";

const readdir = util.promisify(fs.readdir);

export const testData = new WeakMap<TestItem, ITestCase>();
// TODO: This map doesn't seem to work too well, the uri is sometimes url encoded for some reason
export const uriToTestItem = new Map<string, TestItem>();

export function gatherTestItems(collection: TestItemCollection) {
	const items: TestItem[] = [];
	collection.forEach(item => items.push(item));

	return items;
}

export async function getOrCreate(controller: TestController, uri: Uri, force: boolean = false, parentItemCollecton?: TestItemCollection): Promise<TestItem[]> {
  if (uri.fsPath.endsWith('.php')) {
    return await getOrCreateFromFile(controller, uri, force, parentItemCollecton);
  }
  else {
    return await getOrCreateFromDirectory(controller, uri, force, parentItemCollecton);
  }
}

async function getOrCreateFromDirectory(controller: TestController, uri: Uri, force: boolean = false, parentItemCollecton?: TestItemCollection): Promise<TestItem[]> {
  const existing = uriToTestItem.get(uri.toString());
  if (existing) {
    return [existing];
  }

  if (parentItemCollecton) {
    const testCase = new TestDirectory(uri.fsPath);
    const testItem = controller.createTestItem(testCase.getId(), testCase.getLabel(), uri);
    testItem.canResolveChildren = true;

    parentItemCollecton.add(testItem);
    testData.set(testItem, testCase);
    uriToTestItem.set(uri.toString(), testItem);

    // New parent for next recursion
    parentItemCollecton = testItem.children;
  }

  const dirents = await readdir(uri.fsPath, { withFileTypes: true });

  const testItems: TestItem[] = [];
  for (const dirent of dirents) {
    const childUri = Uri.parse(`file:///${path.join(uri.fsPath, dirent.name)}`);

    testItems.push(...(await getOrCreate(controller, childUri, force, parentItemCollecton || controller.items)));
  }

  return testItems;
}

async function getOrCreateFromFile(controller: TestController, uri: Uri, force: boolean = false, parentItemCollecton?: TestItemCollection): Promise<TestItem[]> {
  const existing = uriToTestItem.get(uri.toString());
  if (existing && !force) {
    return [existing];
  }


  if (force && existing) {
    existing.parent?.children.delete(existing.id);
  }

  const testCaseFile = new TestFile(uri.fsPath);
  const testItemFile = controller.createTestItem(testCaseFile.getId(), testCaseFile.getLabel(), uri);
  testData.set(testItemFile, testCaseFile);
  uriToTestItem.set(uri.toString(), testItemFile);
  testItemFile.range = testCaseFile.getRange();
  (parentItemCollecton || controller.items).add(testItemFile);

  const rawContent = await workspace.fs.readFile(uri);
  const content = new TextDecoder('utf-8').decode(rawContent);
  const testCaseNodes = new TestFileParser().parse(content, uri);

  await getOrCreateFromTestCaseNodes(controller, uri, testCaseNodes, testItemFile.children);

  return [testItemFile];
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
  return Uri.parse(`file:///${path}`); 
}
