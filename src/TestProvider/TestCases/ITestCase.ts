import { Range, TestController, TestItem, TestRun, Uri } from "vscode";

export interface ITestCase {
  isResolved: boolean;
  getId(): string;
  getLabel(): string;
  getRange(): Range | undefined;
  // resolve(lazy: boolean): Promise<void>;
  run(item: TestItem, options: TestRun): Promise<boolean>;
}
