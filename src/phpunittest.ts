"use strict";

import { ChildProcess } from "child_process";
import * as fs from "fs";
import * as vscode from "vscode";
import Command from "./Command";
import IPhpUnitDriver from "./Drivers/IPhpUnitDriver";
import PhpUnitDrivers from "./Drivers/PhpUnitDrivers";
import { IExtensionBootstrapBridge } from "./ExtensionBootstrapBridge";
import parsePhpToObject from "./PhpParser/PhpParser";
import { PhpunitArgBuilder } from "./PhpunitCommand/PhpunitArgBuilder";

type RunType =
  | "test"
  | "directory"
  | "suite"
  | "rerun-last-test"
  | "nearest-test";

export class TestRunner {
  public lastArgBuilder?: PhpunitArgBuilder;
  public channel: vscode.OutputChannel;
  public lastCommand?: Command;
  public childProcess?: ChildProcess;
  public bootstrapBridge: IExtensionBootstrapBridge;

  public readonly regex = {
    class: /class\s+(\w*)\s*\{?/gi,
    method: /\s*public*\s+function\s+(\w*)\s*\(/gi
  };

  constructor(
    channel: vscode.OutputChannel,
    bootstrapBridge: IExtensionBootstrapBridge
  ) {
    this.channel = channel;
    this.bootstrapBridge = bootstrapBridge;
  }

  public getClosestMethodAboveActiveLine(
    editor: vscode.TextEditor
  ): string | null {
    for (let i = editor.selection.active.line; i > 0; --i) {
      const line = editor.document.lineAt(i);
      let regexResult = this.regex.method.exec(
        line.text
      );

      if (regexResult) {
        return regexResult[1].toString().trim();
      }

      regexResult = this.regex.class.exec(
        line.text
      );

      if (regexResult) {
        return regexResult[1].toString().trim();
      }
    }

    return null;
  }

  public async resolveContextArgs(
    type: RunType,
    argBuilder: PhpunitArgBuilder,
    config: any,
  ): Promise<boolean> {

    const editor = vscode.window.activeTextEditor;
    if (type === "test" && editor) {
      if (
        "xml" === editor.document.languageId &&
        editor.document.uri.path.match(/phpunit\.xml(\.dist)?$/)
      ) {
        argBuilder.withConfig(editor.document.uri.fsPath);

        return await this.resolveSuiteArgsAsync(argBuilder, editor.document.getText());
      }

      const range = editor.document.getWordRangeAtPosition(
        editor.selection.active
      );
      if (range) {
        const line = editor.document.lineAt(range.start.line);
        const wordOnCursor = editor.document.getText(range);
        const isFunction = line.text.indexOf("function") !== -1;

        if (isFunction && wordOnCursor != null) {
          argBuilder.addDirectoryOrFile(editor.document.uri.fsPath);
          argBuilder.addFilter(wordOnCursor);

          return true;
        } else if (line.text.indexOf("class") !== -1) {
          argBuilder.addDirectoryOrFile(editor.document.uri.fsPath);

          return true;
        }
      }

      if (!config.preferRunClassTestOverQuickPickWindow) {
        let testableList = [];
        // Gather the class and functions to show in the quick pick window.
        {
          const closestMethod = this.getClosestMethodAboveActiveLine(
            editor
          );
          if (closestMethod) {
            testableList.push("function - " + closestMethod);
          }

          const parsedPhpClass = await parsePhpToObject(
            editor.document.fileName
          );
          testableList.push("class - " + parsedPhpClass.name);
          testableList = testableList.concat(
            parsedPhpClass.methods.public.map(m => "function - " + m)
          );
        }

        const selectedTest = await vscode.window.showQuickPick(
          testableList
        );
        if (!selectedTest) {
          return false;
        }

        if (selectedTest.indexOf("function - ") !== -1) {
          argBuilder.addDirectoryOrFile(editor.document.uri.fsPath);
          argBuilder.addFilter(selectedTest.replace("function - ", ""));

          return true;
        } else if (selectedTest.indexOf("class - ") !== -1) {
          argBuilder.addDirectoryOrFile(editor.document.uri.fsPath);

          return true;
        }
      }
    } else if (type === "nearest-test" && editor) {
      const closestMethod = this.getClosestMethodAboveActiveLine(editor);
      if (!closestMethod) {
        console.error("No method found above the cursor. Make sure the cursor is close to a method.");

        return false;
      }

      argBuilder.addDirectoryOrFile(editor.document.uri.fsPath);
      argBuilder.addFilter(closestMethod);

      return true;
    } else if (type === "suite") {
      const files = await vscode.workspace.findFiles(
        "**/phpunit.xml**",
        "**/vendor/**"
      );
      let selectedSuiteFile = files && files.length === 1 ? files[0].fsPath : undefined;
      if (files && files.length > 1) {
        selectedSuiteFile = await vscode.window.showQuickPick(
          files.map(f => f.fsPath),
          { placeHolder: "Choose test suite file..." }
        );
      }

      if (!selectedSuiteFile) {
        return false;
      }

      const selectedSuiteFileContent = await new Promise<string>(
        (resolve, reject) => {
          fs.readFile(selectedSuiteFile!, "utf8", (err, data) => {
            if (err) {
              reject(err);
            } else {
              resolve(data);
            }
          });
        }
      );

      argBuilder.withConfig(selectedSuiteFile);

      return await this.resolveSuiteArgsAsync(argBuilder, selectedSuiteFileContent);
    } else if (type === "directory") {
      if (!editor) {
        console.error("Please open a file in the directory you want to test.");

        return false;
      }

      const currentDir = editor.document.uri.fsPath.replace(/(\/|\\)\w*\.php$/i, "");
      argBuilder.addDirectoryOrFile(currentDir);

      return true;
    }

    return false;
  }

  public async getDriver(order?: string[]): Promise<IPhpUnitDriver | undefined> {
    const drivers: IPhpUnitDriver[] = [
      new PhpUnitDrivers.Path(),
      new PhpUnitDrivers.Composer(),
      new PhpUnitDrivers.Phar(),
      new PhpUnitDrivers.GlobalPhpUnit(),
      new PhpUnitDrivers.Command(),
      new PhpUnitDrivers.DockerContainer(),
      new PhpUnitDrivers.Docker(),
      new PhpUnitDrivers.Ssh(),
      new PhpUnitDrivers.Legacy()
    ];

    function arrayUnique(array: any[]) {
      const a = array.concat();
      for (let i = 0; i < a.length; ++i) {
        for (let j = i + 1; j < a.length; ++j) {
          if (a[i] === a[j]) {
            a.splice(j--, 1);
          }
        }
      }

      return a;
    }
    order = arrayUnique((order || []).concat(drivers.map(d => d.name)));

    const sortedDrivers = drivers.sort((a, b) => {
      return order!.indexOf(a.name) - order!.indexOf(b.name);
    });

    for (const d of sortedDrivers) {
      if (await d.isInstalled()) {
        return d;
      }
    }

    return undefined;
  }

  public async runArgs(argBuilder: PhpunitArgBuilder) {
    const config = vscode.workspace.getConfiguration("phpunit");
    const order = config.get<string[]>("driverPriority");

    const driver = await this.getDriver(order);
    if (!driver) {
      console.error(`Wasn't able to start phpunit.`);
      return;
    }

    const configArgs = config.get<string[]>("args", []);
    argBuilder.addArgs(configArgs);

    const colors = config.get<string>("colors");
    if (colors && (configArgs.indexOf(colors) === -1)) {
      argBuilder.withColors(colors.replace(/--colors=?/i, '') as 'never' | 'auto' | 'always');
    }

    const pathMappings = config.get<{ [key: string]: string }>("paths");
    if (pathMappings) {
      argBuilder.withPathMappings(pathMappings, vscode.workspace.workspaceFolders![0].uri.fsPath);
    }
    
    this.lastArgBuilder = argBuilder;
    const runConfig = await driver.run(argBuilder.buildArgs());

    if (config.get<string>("clearOutputOnRun")) {
      this.channel.clear();
    }
    this.channel.appendLine(`Running phpunit with driver: ${driver.name}`);
    this.channel.appendLine(runConfig.command);

    this.bootstrapBridge.setTaskCommand(
      runConfig.command,
      runConfig.problemMatcher
    );

    if (process.env.VSCODE_PHPUNIT_TEST === 'true') {
      console.debug(runConfig.command);
    }

    await vscode.commands.executeCommand("workbench.action.terminal.clear");
    await vscode.commands.executeCommand(
      "workbench.action.tasks.runTask",
      "phpunit: run"
    );

    this.channel.show(true);
  }

  public async run(type: RunType) {
    let argBuilder = new PhpunitArgBuilder();

    const config = vscode.workspace.getConfiguration("phpunit");
    const order = config.get<string[]>("driverPriority");

    const driver = await this.getDriver(order);
    if (!driver) {
      console.error(`Wasn't able to start phpunit.`);
      return;
    }

    if (type === "rerun-last-test" && this.lastArgBuilder) {
      argBuilder = this.lastArgBuilder;
    } else {
      const configArgs = config.get<string[]>("args", []);
      argBuilder.addArgs(configArgs);
  
      const colors = config.get<string>("colors");
      if (colors && (configArgs.indexOf(colors) === -1)) {
        argBuilder.withColors(colors.replace(/--colors=?/i, '') as 'never' | 'auto' | 'always');
      }
  
      const pathMappings = config.get<{ [key: string]: string }>("paths");
      if (pathMappings) {
        argBuilder.withPathMappings(pathMappings, vscode.workspace.workspaceFolders![0].uri.fsPath);
      }
  
      const preferRunClassTestOverQuickPickWindow = config.get<boolean>(
        "preferRunClassTestOverQuickPickWindow",
        false
      );
      const shouldRun = await this.resolveContextArgs(type, argBuilder, {
        preferRunClassTestOverQuickPickWindow
      });

      if (!shouldRun) {
        return;
      }

      this.lastArgBuilder = argBuilder;
    }

    if (config.get<string>("clearOutputOnRun")) {
      this.channel.clear();
    }
    this.channel.appendLine(`Running phpunit with driver: ${driver.name}`);

    const runConfig = await driver.run(argBuilder.buildArgs());
    this.channel.appendLine(runConfig.command);

    this.bootstrapBridge.setTaskCommand(
      runConfig.command,
      runConfig.problemMatcher
    );

    if (process.env.VSCODE_PHPUNIT_TEST === 'true') {
      console.debug(runConfig.command);
    }

    await vscode.commands.executeCommand("workbench.action.terminal.clear");
    await vscode.commands.executeCommand(
      "workbench.action.tasks.runTask",
      "phpunit: run"
    );

    this.channel.show(true);
  }

  public async stop() {
    await vscode.commands.executeCommand(
      "workbench.action.tasks.terminate",
      "phpunit: run"
    );
  }

  private async resolveSuiteArgsAsync(
    argBuilder: PhpunitArgBuilder,
    fileContent: string
  ): Promise<boolean> {
    const testSuitesMatch = fileContent.match(/<testsuite[^>]+name="[^"]+">/g);
    const testSuites = testSuitesMatch ? testSuitesMatch.map(v => v.match(/name="([^"]+)"/)![1]) : null;

    if (!testSuites || testSuites.length === 0) {
      return false;
    }

    if (testSuites.length === 1) {
      argBuilder.addSuite(testSuites[0]);

      return true;
    } 

    const selectedSuite = await vscode.window.showQuickPick(
      ["Run All Test Suites...", ...testSuites],
      { placeHolder: "Choose test suite..." }
    );

    if (!selectedSuite) {
      return false;
    }

    if (selectedSuite === "Run All Test Suites...") {
      return true;
    }

    argBuilder.addSuite(selectedSuite);

    return true;
  }
}
