"use strict";

import { ChildProcess } from "child_process";
import * as escapeRegexp from "escape-string-regexp";
import * as vscode from "vscode";
import PhpUnitDriverInterface from "./Drivers/PhpUnitDriverInterface";
import PhpUnitDrivers from "./Drivers/PhpUnitDrivers";
import { ExtensionBootstrapBridge } from "./ExtensionBootstrapBridge";
import parsePhpToObject from "./PhpParser";

type RunType = "test" | "directory" | "rerun-last-test" | "nearest-test";

class Command {
  public execPath: string;
  public args: string[];
  public putFsPathIntoArgs: boolean;
}

export class TestRunner {
  public lastContextArgs: string[];
  public channel: vscode.OutputChannel;
  public lastCommand: Command;
  public childProcess: ChildProcess;
  public bootstrapBridge: ExtensionBootstrapBridge;

  public readonly regex = {
    method: /\s*public*\s+function\s+(\w*)\s*\(/gi,
    class: /class\s+(\w*)\s*{?/gi
  };

  constructor(
    channel: vscode.OutputChannel,
    bootstrapBridge: ExtensionBootstrapBridge
  ) {
    this.channel = channel;
    this.bootstrapBridge = bootstrapBridge;
  }

  public getClosestMethodAboveActiveLine(
    editor: vscode.TextEditor
  ): string | null {
    for (let i = editor.selection.active.line; i > 0; --i) {
      const line = editor.document.lineAt(i);
      const regexResult = /\s*public*\s+function\s+(\w*)\s*\(/gi.exec(
        line.text
      );

      if (regexResult) {
        return regexResult[1].toString().trim();
      }
    }

    return null;
  }

  public async resolveContextArgs(type: RunType, config): Promise<string[]> {
    let args = [];
    switch (type) {
      case "test": {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
          const range = editor.document.getWordRangeAtPosition(
            editor.selection.active
          );
          if (range) {
            const line = editor.document.lineAt(range.start.line);
            const wordOnCursor = editor.document.getText(range);
            const isFunction = line.text.indexOf("function") != -1;

            if (isFunction && wordOnCursor != null) {
              // Test a specific function in this file
              args.push(editor.document.uri.fsPath);
              args.push("--filter");
              args.push(wordOnCursor);
              break;
            } else if (line.text.indexOf("class") != -1) {
              // The the class.
              args.push(editor.document.uri.fsPath);
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
              if (selectedTest.indexOf("function - ") != -1) {
                // Test the function.
                args.push(editor.document.uri.fsPath);
                args.push("--filter");
                args.push(selectedTest.replace("function - ", ""));
                break;
              } else if (selectedTest.indexOf("class - ") != -1) {
                // Test the class.
                args.push(editor.document.uri.fsPath);
                break;
              }
            } else {
              // Make sure to return null args to indicate that we should not run any test.
              return null;
            }
          }

          // NOTE: No `break` statement here, we will fall-through to `nearest-test`.
        } else {
          break;
        }
      }

      case "nearest-test": {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
          const closestMethod = this.getClosestMethodAboveActiveLine(editor);
          if (closestMethod) {
            // Test the function.
            args.push(editor.document.uri.fsPath);
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

      case "directory": {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
          const currentDir = editor.document.uri.fsPath.replace(
            /(\/|\\)\w*\.php$/i,
            ""
          );
          args.push(currentDir);
        } else {
          console.error(
            "Please open a file in the directory you want to test."
          );
        }
        break;
      }

      case "rerun-last-test": {
        args = args.concat(this.lastContextArgs.slice());
        break;
      }
    }

    return args;
  }

  public async getDriver(order?: string[]): Promise<PhpUnitDriverInterface> {
    const drivers: PhpUnitDriverInterface[] = [
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

    function arrayUnique(array) {
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
      return order.indexOf(a.name) - order.indexOf(b.name);
    });

    for (const d of sortedDrivers) {
      if (await d.isInstalled()) {
        return d;
      }
    }

    return null;
  }

  public async run(type: RunType) {
    const config = vscode.workspace.getConfiguration("phpunit");
    const order = config.get<string[]>("driverPriority");

    const driver = await this.getDriver(order);
    if (driver) {
      if (config.get<string>("clearOutputOnRun")) {
        this.channel.clear();
      }

      const configArgs = config.get<string[]>("args", []);
      const preferRunClassTestOverQuickPickWindow = config.get<Boolean>(
        "preferRunClassTestOverQuickPickWindow",
        false
      );

      const contextArgs = await this.resolveContextArgs(type, {
        preferRunClassTestOverQuickPickWindow
      });
      if (contextArgs) {
        this.lastContextArgs = contextArgs;
        const runArgs = this.lastContextArgs.concat(configArgs);

        this.channel.appendLine(`Running phpunit with driver: ${driver.name}`);

        const runConfig = await driver.run(runArgs);

        runConfig.command = runConfig.command.replace(/\\/gi, "/");

        const pathMappings = config.get<string>("paths");
        if (pathMappings) {
          for (const key of Object.keys(pathMappings)) {
            const localPath = key
              .replace(/\$\{workspaceFolder\}/gi, vscode.workspace.rootPath)
              .replace(/\\/gi, "/");

            runConfig.command = runConfig.command.replace(
              new RegExp(escapeRegexp(localPath), "ig"),
              pathMappings[key]
            );
          }
        }

        this.channel.appendLine(runConfig.command);

        this.bootstrapBridge.setTaskCommand(
          runConfig.command,
          runConfig.problemMatcher
        );
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
    } else {
      console.error(`Wasn't able to start phpunit.`);
    }
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
}
