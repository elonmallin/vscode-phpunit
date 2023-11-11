"use strict";

import * as vscode from "vscode";
import { TestRunner } from "./phpunittest";

export function activate(context: vscode.ExtensionContext) {
  let taskCommand: string;
  let problemMatcher: string | undefined;
  const outputChannel = vscode.window.createOutputChannel("phpunit");
  const PHPUnitTestRunner: TestRunner = new TestRunner(outputChannel, {
    setTaskCommand: (command: string, matcher?: string) => {
      taskCommand = command;
      problemMatcher = matcher;
    }
  });

  context.subscriptions.push(
    vscode.commands.registerCommand("phpunit.Test", async () => {
      return await PHPUnitTestRunner.run("test");
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("phpunit.TestNearest", async () => {
      return PHPUnitTestRunner.run("nearest-test");
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("phpunit.TestSuite", async () => {
      return PHPUnitTestRunner.run("suite");
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("phpunit.TestDirectory", async () => {
      return PHPUnitTestRunner.run("directory");
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("phpunit.RerunLastTest", async () => {
      return PHPUnitTestRunner.run("rerun-last-test");
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("phpunit.TestingStop", async () => {
      return PHPUnitTestRunner.stop();
    })
  );

  context.subscriptions.push(
    vscode.tasks.registerTaskProvider("phpunit", {
      provideTasks: () => {
        return [
          new vscode.Task(
            { type: "phpunit", task: "run" },
            vscode.TaskScope.Workspace,
            "run",
            "phpunit",
            new vscode.ShellExecution(
              taskCommand,
              {
                env: vscode.workspace.getConfiguration('phpunit').envVars
              },
            ),
            problemMatcher || "$phpunit"
          )
        ];
      },
      // Hack around typescript compiler
      resolveTask: (task: vscode.Task, token: vscode.CancellationToken) => {
        return null as any as vscode.ProviderResult<vscode.Task>;
      }
    })
  );
}

// this method is called when your extension is deactivated
// eslint-disable-next-line @typescript-eslint/no-empty-function
export function deactivate() {}
