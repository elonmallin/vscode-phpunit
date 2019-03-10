"use strict";

import * as vscode from "vscode";
import { TestRunner } from "./phpunittest";

export function activate(context: vscode.ExtensionContext) {
  let taskCommand: string = null;
  let problemMatcher: string = null;
  const outputChannel = vscode.window.createOutputChannel("phpunit");
  const PHPUnitTestRunner: TestRunner = new TestRunner(outputChannel, {
    setTaskCommand: (command: string, matcher?: string) => {
      taskCommand = command;
      problemMatcher = matcher;
    }
  });

  context.subscriptions.push(
    vscode.commands.registerCommand("phpunit.Test", () => {
      PHPUnitTestRunner.run("test");
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("phpunit.TestNearest", () => {
      PHPUnitTestRunner.run("nearest-test");
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("phpunit.TestDirectory", () => {
      PHPUnitTestRunner.run("directory");
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("phpunit.RerunLastTest", () => {
      PHPUnitTestRunner.run("rerun-last-test");
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("phpunit.TestingStop", () => {
      PHPUnitTestRunner.stop();
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
            new vscode.ShellExecution(taskCommand),
            problemMatcher || "$phpunit"
          )
        ];
      },
      resolveTask: undefined
    })
  );
}

// this method is called when your extension is deactivated
export function deactivate() {}
