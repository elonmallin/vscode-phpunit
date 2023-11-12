"use strict";

import { ChildProcess } from "child_process";
import escapeStringRegexp from "./Utils/escape-string-regexp";
import * as fs from "fs";
import * as vscode from "vscode";
import Command from "./Command";
import IPhpUnitDriver from "./Drivers/IPhpUnitDriver";
import PhpUnitDrivers from "./Drivers/PhpUnitDrivers";
import { IExtensionBootstrapBridge } from "./ExtensionBootstrapBridge";
import parsePhpToObject from "./PhpParser/PhpParser";

type RunType =
  | "test"
  | "directory"
  | "suite"
  | "rerun-last-test"
  | "nearest-test";

export class TestRunner {
  public lastContextArgs?: string[];
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
    configArgs: string[],
    config: any,
  ): Promise<string[] | undefined> {
    let args = configArgs.slice();

    switch (type) {
      case "test": {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
          if (
            "xml" === editor.document.languageId &&
            editor.document.uri.path.match(/phpunit\.xml(\.dist)?$/)
          ) {
            if (
              await this.resolveSuiteArgsAsync(
                args,
                editor.document.uri.fsPath,
                editor.document.getText()
              )
            ) {
              break;
            }
          }

          const range = editor.document.getWordRangeAtPosition(
            editor.selection.active
          );
          if (range) {
            const line = editor.document.lineAt(range.start.line);
            const wordOnCursor = editor.document.getText(range);
            const isFunction = line.text.indexOf("function") !== -1;

            if (isFunction && wordOnCursor != null) {
              // Test a specific function in this file
              args.push(`'${editor.document.uri.fsPath}'`);
              args.push("--filter");
              args.push(wordOnCursor);
              break;
            } else if (line.text.indexOf("class") !== -1) {
              // Test the class.
              args.push(`'${editor.document.uri.fsPath}'`);
              break;
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
            if (selectedTest) {
              if (selectedTest.indexOf("function - ") !== -1) {
                // Test the function.
                args.push(`'${editor.document.uri.fsPath}'`);
                args.push("--filter");
                args.push(selectedTest.replace("function - ", ""));
                break;
              } else if (selectedTest.indexOf("class - ") !== -1) {
                // Test the class.
                args.push(`'${editor.document.uri.fsPath}'`);
                break;
              }
            } else {
              // Make sure to return null args to indicate that we should not run any test.
              return undefined;
            }
          }

          // NOTE: No `break` statement here, we will fall-through to `nearest-test`.
        } else {
          break;
        }
      }

      // eslint-disable-next-line no-fallthrough
      case "nearest-test": {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
          const closestMethod = this.getClosestMethodAboveActiveLine(editor);
          if (closestMethod) {
            // Test the function.
            args.push(`'${editor.document.uri.fsPath}'`);
            args.push("--filter");
            args.push(closestMethod);
          } else {
            console.error(
              "No method found above the cursor. Make sure the cursor is close to a method."
            );
          }
        }
        break;
      }

      case "suite": {
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

        if (selectedSuiteFile) {
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

          if (
            await this.resolveSuiteArgsAsync(
              args,
              selectedSuiteFile,
              selectedSuiteFileContent
            )
          ) {
            break;
          }
        }

        return undefined; // Don't run since user escaped out of quick pick.
      }

      case "directory": {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
          const currentDir = editor.document.uri.fsPath.replace(
            /(\/|\\)\w*\.php$/i,
            ""
          );
          args.push(`'${currentDir}'`);
        } else {
          console.error(
            "Please open a file in the directory you want to test."
          );
        }
        break;
      }

      case "rerun-last-test": {
        args = args.concat(this.lastContextArgs!.slice());
        break;
      }
    }

    return args;
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

  public async run(type: RunType) {
    const config = vscode.workspace.getConfiguration("phpunit");
    const order = config.get<string[]>("driverPriority");

    const driver = await this.getDriver(order);
    if (!driver) {
      console.error(`Wasn't able to start phpunit.`);
      return;
    }

    if (config.get<string>("clearOutputOnRun")) {
      this.channel.clear();
    }

    const configArgs = config.get<string[]>("args", []);
    const preferRunClassTestOverQuickPickWindow = config.get<boolean>(
      "preferRunClassTestOverQuickPickWindow",
      false
    );
    const colors = config.get<string>("colors");
    if (colors && (configArgs.indexOf(colors) === -1)) {
      configArgs.push(colors);
    }

    const contextArgs = await this.resolveContextArgs(type, configArgs, {
      preferRunClassTestOverQuickPickWindow
    });
    if (!contextArgs) {
      return;
    }

    const runArgs = (this.lastContextArgs = contextArgs);

    this.channel.appendLine(`Running phpunit with driver: ${driver.name}`);

    const runConfig = await driver.run(runArgs);

    runConfig.command = runConfig.command.replace(/\\/gi, "/");

    const pathMappings = config.get<{ [key: string]: string }>("paths");
    if (pathMappings) {
      for (const key of Object.keys(pathMappings)) {
        const localPath = key
          .replace(/\$\{workspaceFolder\}/gi, vscode.workspace.workspaceFolders![0].uri.fsPath)
          .replace(/\\/gi, "/");

        runConfig.command = runConfig.command.replace(
          new RegExp(escapeStringRegexp(localPath), "ig"),
          pathMappings[key]
        );
      }
    }

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

    /*this.childProcess.stderr.on('data', (buffer: Buffer) => {
                this.channel.append(buffer.toString());
            });
            this.childProcess.stdout.on('data', (buffer: Buffer) => {
                this.channel.append(buffer.toString());
            });*/

    this.channel.show(true);
  }

  public async stop() {
    await vscode.commands.executeCommand(
      "workbench.action.tasks.terminate",
      "phpunit: run"
    );

    /*if (this.childProcess !== undefined)
        {
            this.childProcess.kill('SIGINT');
            this.channel.append("\nTesting Stop\n");
            this.channel.show();
        }*/
  }

  private async resolveSuiteArgsAsync(
    args: string[],
    filePath: string,
    fileContent: string
  ): Promise<boolean> {
    const testSuitesMatch = fileContent.match(/<testsuite[^>]+name="[^"]+">/g);
    let testSuites;
    if (testSuitesMatch) {
      testSuites = testSuitesMatch.map(v => v.match(/name="([^"]+)"/)![1]);
    }
    if (testSuites) {
      if (testSuites.length > 1) {
        const selectedSuite = await vscode.window.showQuickPick(
          ["Run All Test Suites...", ...testSuites],
          { placeHolder: "Choose test suite..." }
        );

        if (selectedSuite) {
          const configArgsIdx = args.findIndex(
            a => /^(--configuration|-c)$/i.test(a)
          );

          if (configArgsIdx !== -1) {
            this.channel.appendLine(
              `(--configuration|-c) already exists with ${
                args[configArgsIdx + 1]
              }, replacing with ${filePath}`
            );
            args[configArgsIdx + 1] = filePath;
          } else {
            args.push("-c");
            args.push(filePath);
          }

          if (selectedSuite !== "Run All Test Suites...") {
            args.push("--testsuite");
            args.push(`'${selectedSuite}'`);
          }

          return true;
        }
      } else if (testSuites.length === 1) {
        const configArgsIdx = args.findIndex(
          a => /^(--configuration|-c)$/i.test(a)
        );

        if (configArgsIdx !== -1) {
          this.channel.appendLine(
            `(--configuration|-c) already exists with ${
              args[configArgsIdx + 1]
            }, replacing with ${filePath}`
          );
          args[configArgsIdx + 1] = filePath;
        } else {
          args.push("-c");
          args.push(filePath);
        }

        args.push("--testsuite");
        args.push(`'${testSuites[0]}'`);

        return true;
      }
    }

    return false;
  }
}
