import { Location, Position, TestItem, TestMessage, TestRun } from "vscode";
import { ITestCase } from "./ITestCase";
import * as path from "path";
import { testData } from "./TestCaseRepository";

export class TestDirectory implements ITestCase {
  private readonly testItem: TestItem | undefined;

	constructor(
		private readonly directory: string,
    public isResolved: boolean = false
	) { }

	getId() {
		return `${this.directory}`;
	}

  getLabel() {
    return path.basename(this.directory);
  }

  getRange() {
    return undefined;
  }

  getTestItem() {
    return this.testItem;
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
