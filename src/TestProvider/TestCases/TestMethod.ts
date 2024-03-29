import { Location, Range, TestItem, TestMessage, TestRun } from "vscode";
import { PHPUnitTestRunner } from "../../extension";
import { PhpunitArgBuilder } from "../../PhpunitCommand/PhpunitArgBuilder";
import { SpawnSyncReturns } from "child_process";
import { getTestFailedDiff } from "../../PhpParser/TestDiffParser";
import { ITestCase } from "./ITestCase";
import { IRunConfig } from "../../RunConfig";
import * as os from "os";

export class TestMethod implements ITestCase {
  constructor(
    private readonly fileName: string,
    private readonly method: string,
    public readonly range: Range,
    public readonly className: string | undefined = undefined,
    public readonly namespace: string | undefined = undefined,
    public isResolved: boolean = true,
  ) {}

  getId() {
    return `${this.fileName}${this.namespace ? `/${this.namespace}` : ""}${
      this.className ? `/${this.className}` : ""
    }/${this.method}`;
  }

  getLabel() {
    return this.method;
  }

  getRange() {
    return this.range;
  }

  async run(item: TestItem, options: TestRun): Promise<boolean> {
    const start = Date.now();

    const argBuilder = new PhpunitArgBuilder();
    argBuilder.addDirectoryOrFile(this.fileName);
    argBuilder.withFilter(this.method);

    const { spawnResult, runConfig } = (await PHPUnitTestRunner.runArgs(
      argBuilder,
      true,
    )) as { spawnResult: SpawnSyncReturns<string>; runConfig: IRunConfig };

    const duration = Date.now() - start;

    options.appendOutput(
      `${[runConfig.exec, ...runConfig.args].join(" ")}${os.EOL}${os.EOL}`,
      undefined,
      item,
    );
    if (spawnResult.stdout) {
      options.appendOutput(`${spawnResult.stdout}${os.EOL}`, undefined, item);
    }
    if (spawnResult.stderr) {
      console.error(spawnResult.stderr);
    }

    if (spawnResult.status === 0) {
      options.passed(item, duration);

      return true;
    }

    try {
      const testDiff = getTestFailedDiff(spawnResult.stdout);
      const message = TestMessage.diff(
        testDiff.message,
        testDiff.expected,
        testDiff.actual,
      );
      const lineNumber = /.*\.php:(\d+)/im.exec(spawnResult.stdout);
      const range = lineNumber?.[1]
        ? new Range(
            parseInt(lineNumber[1]) - 1,
            0,
            parseInt(lineNumber[1]) - 1,
            0,
          )
        : item.range!;
      message.location = new Location(item.uri!, range);

      options.failed(item, message, duration);

      return false;
    } catch (e: any) {
      const duration = Date.now() - start;
      const message = new TestMessage(e.message);
      message.location = new Location(item.uri!, item.range!);
      options.failed(item, new TestMessage(e.message), duration);

      return false;
    }
  }
}
