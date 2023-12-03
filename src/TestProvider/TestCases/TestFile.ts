import { Location, Position, TestItem, TestMessage, TestRun } from "vscode";
import { ITestCase } from "./ITestCase";
import path = require("path");
import { testData } from "./TestCaseRepository";

export class TestFile implements ITestCase {
	constructor(
		private readonly fileName: string,
    public isResolved: boolean = true
	) { }

	getId() {
		return `${this.fileName}`;
	}

	getLabel() {
		return path.basename(this.fileName);
	}

  getRange() {
    return undefined;
  }

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
