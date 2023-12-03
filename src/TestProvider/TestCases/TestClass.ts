import { Location, Position, Range, TestController, TestItem, TestMessage, TestRun, Uri } from "vscode";
import { ITestCase } from "./ITestCase";
import { testData } from "./TestCaseRepository";

export class TestClass implements ITestCase {
	constructor(
		private readonly fileName: string,
    private readonly className: string,
    public readonly range: Range,
    public readonly namespace: string | undefined = undefined,
    public isResolved: boolean = true
	) { }

	getId() {
		return `${this.fileName}${this.namespace ? `/${this.namespace}` : ''}/${this.className}`;
	}

	getLabel() {
		return this.className;
	}

  getRange() {
    return this.range;
  }

  // async resolve(lazy: boolean): Promise<void> {
  //   if (this.isResolved) {
  //     return;
  //   }

  //   const dirents = await readdir(this.uri.fsPath, { withFileTypes: true });

  //   for (const dirent of dirents) {
  //     const childUri = Uri.parse(`file:///${path.join(this.uri.fsPath, dirent.name)}`);

  //     const existing = this.parent?.children.get(childUri.toString()) || this.controller.items.get(childUri.toString());
  //     if (existing) {
  //       continue;
  //     }

  //     if (dirent.isDirectory()) {
  //       const testCase = new TestDirectory(this.controller, childUri, this.testItem, dirent.name);
  //       if (!lazy) {
  //         await testCase.resolve(lazy);
  //       }
  //     }
  //     else if (dirent.isFile()) {
  //       await findTestsInFile(this.controller, childUri, this.parent);
  //     }
  //   }

  //   this.isResolved = !lazy;
  // }

	async run(item: TestItem, options: TestRun): Promise<boolean> {
		const start = Date.now();

    const testCasePromises: Promise<boolean>[] = [];
    for (const [id, child] of item.children) {
      const testCase = testData.get(child)!;
      testCasePromises.push(testCase.run(child, options));
    }

    try {
      await Promise.all(testCasePromises);

      const duration = Date.now() - start;
      options.passed(item, duration);

      return true;
    }
    catch (e) {
      const duration = Date.now() - start;
      const message = new TestMessage('Failed');
      message.location = new Location(item.uri!, new Position(0, 0));
      options.failed(item, new TestMessage('Failed'), duration);

      return false;
    }
	}
}
