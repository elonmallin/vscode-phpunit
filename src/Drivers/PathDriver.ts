import * as cmdExists from "command-exists";
import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { IRunConfig } from "../RunConfig";
import IPhpUnitDriver from "./IPhpUnitDriver";

export default class Path implements IPhpUnitDriver {
  public name = "Path";
  private phpPathCache?: string;
  private phpUnitPathCache?: string;

  public async run(args: string[]): Promise<IRunConfig> {
    const execPath = await this.phpPath();
    args = [await this.phpUnitPath()].concat(args);

    const command = `${execPath} ${args.join(" ")}`;

    return {
      command: command
    };
  }

  public async isInstalled(): Promise<boolean> {
    return !!((await this.phpPath()) && (await this.phpUnitPath()));
  }

  public async phpPath(): Promise<string> {
    if (this.phpPathCache) {
      return this.phpPathCache;
    }

    const config = vscode.workspace.getConfiguration("phpunit");
    try {
      this.phpPathCache = await new Promise((resolve, reject) => {
        const configPath = config.get<string>("php");

        if (fs.existsSync(configPath!)) {
          resolve(configPath!);
        } else {
          reject();
        }
      });
    } catch (e) {
      try {
        this.phpPathCache = await cmdExists("php");
      } catch (e) {
        // Continue regardless of error
      }
    }

    return this.phpPathCache!;
  }

  public async phpUnitPath(): Promise<string> {
    if (this.phpUnitPathCache) {
      return this.phpUnitPathCache;
    }

    const config = vscode.workspace.getConfiguration("phpunit");
    const phpUnitPath = config.get<string>("phpunit");
    this.phpUnitPathCache = !phpUnitPath
      ? undefined
      : await new Promise<string>((resolve, reject) => {
          try {
            fs.exists(phpUnitPath, exists => {
              if (exists) {
                this.phpUnitPathCache = phpUnitPath;
                resolve(this.phpUnitPathCache);
              } else {
                const absPhpUnitPath = path.join(
                  vscode.workspace.workspaceFolders![0].uri.fsPath,
                  phpUnitPath
                );
                fs.exists(absPhpUnitPath, absExists => {
                  if (absExists) {
                    this.phpUnitPathCache = absPhpUnitPath;
                    resolve(this.phpUnitPathCache);
                  } else {
                    resolve("");
                  }
                });
              }
            });
          } catch (e) {
            resolve("");
          }
        });

    this.phpUnitPathCache = this.phpUnitPathCache
      ? `'${this.phpUnitPathCache}'`
      : this.phpUnitPathCache;

    return this.phpUnitPathCache!;
  }
}
