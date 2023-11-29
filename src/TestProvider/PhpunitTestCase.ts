import { Location, Range, TestItem, TestMessage, TestRun } from "vscode";
import { PHPUnitTestRunner } from "../extension";
import { PhpunitArgBuilder } from "../PhpunitCommand/PhpunitArgBuilder";
import { SpawnSyncReturns } from "child_process";
import { getTestFailedDiff } from "../PhpParser/TestDiffParser";

export class TestCase {
	constructor(
		private readonly fileName: string,
    private readonly className: string,
    private readonly method: string,
    public readonly range: Range,
		public generation: number
	) { }

	getId() {
		return `${this.fileName} ${this.className} ${this.method}`;
	}

	getLabel() {
		return this.className || this.method;
	}

	async run(item: TestItem, options: TestRun): Promise<boolean> {
		const start = Date.now();

    const argBuilder = new PhpunitArgBuilder();
    argBuilder.addDirectoryOrFile(this.fileName);
    argBuilder.withFilter(this.className || this.method);
    const { status, stdout, stderr, error } = await PHPUnitTestRunner.runArgs(argBuilder, true) as SpawnSyncReturns<string>;

		const duration = Date.now() - start;

		if (status === 0) {
			options.passed(item, duration);

      return true;
		} 

    const testDiff = getTestFailedDiff(stdout);
    const message = TestMessage.diff(testDiff.message, testDiff.expected, testDiff.actual);
    message.location = new Location(item.uri!, item.range!);
    options.failed(item, message, duration);

    return false;
	}
}
