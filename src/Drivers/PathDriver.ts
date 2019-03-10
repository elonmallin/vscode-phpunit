import * as cmdExists from "command-exists";
import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { RunConfig } from "../RunConfig";
import PhpUnitDriverInterface from "./PhpUnitDriverInterface";

export default class Path implements PhpUnitDriverInterface {
  public name: string = "Path";
  private _phpPath: string;
  private _phpUnitPath: string;

  public async run(args: string[]): Promise<RunConfig> {
    const execPath = await this.phpPath();
    args = [await this.phpUnitPath()].concat(args);

    const command = `${execPath} ${args.join(" ")}`;

    return {
      command: command
    };
  }

  public async isInstalled(): Promise<boolean> {
    return (await this.phpPath()) != null && (await this.phpUnitPath()) != null;
  }

  public async phpPath(): Promise<string> {
    if (this._phpPath) {
      return this._phpPath;
    }

    const config = vscode.workspace.getConfiguration("phpunit");
    try {
      this._phpPath = await cmdExists(config.get<string>("php"));
    } catch (e) {
      try {
        this._phpPath = await cmdExists("php");
      } catch (e) {}
    }

    return this._phpPath;
  }

  public async phpUnitPath(): Promise<string> {
    if (this._phpUnitPath) {
      return this._phpUnitPath;
    }

    const config = vscode.workspace.getConfiguration("phpunit");
    const phpUnitPath = config.get<string>("phpunit");
    return !phpUnitPath
      ? null
      : new Promise<string>((resolve, reject) => {
          try {
            fs.exists(phpUnitPath, exists => {
              if (exists) {
                this._phpUnitPath = phpUnitPath;
                resolve(this._phpUnitPath);
              } else {
                const absPhpUnitPath = path.join(
                  vscode.workspace.rootPath,
                  phpUnitPath
                );
                fs.exists(absPhpUnitPath, exists => {
                  if (exists) {
                    this._phpUnitPath = absPhpUnitPath;
                    resolve(this._phpUnitPath);
                  } else {
                    resolve();
                  }
                });
              }
            });
          } catch (e) {
            resolve();
          }
        });
  }
}
