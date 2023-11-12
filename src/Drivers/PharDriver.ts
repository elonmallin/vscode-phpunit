import * as cp from "child_process";
import * as cmdExists from "command-exists";
import * as fs from "fs";
import * as vscode from "vscode";
import { IRunConfig } from "../RunConfig";
import IPhpUnitDriver from "./IPhpUnitDriver";

export default class Phar implements IPhpUnitDriver {
  public name = "Phar";
  public phpPathCache?: string;
  public phpUnitPharPathCache?: string;
  public hasPharExtensionCache?: boolean;

  public async run(args: string[]): Promise<IRunConfig> {
    const execPath = await this.phpPath();
    args = [await this.phpUnitPath()].concat(args);

    const command = `${execPath} ${args.join(" ")}`;

    return {
      command: command
    };
  }

  public async isInstalled(): Promise<boolean> {
    return !!(
      (await this.phpPath()) &&
      (await this.hasPharExtension()) &&
      (await this.phpUnitPath())
    );
  }

  public async hasPharExtension(): Promise<boolean> {
    if (this.hasPharExtensionCache) {
      return this.hasPharExtensionCache;
    }

    return (this.hasPharExtensionCache = await new Promise<boolean>(
      // eslint-disable-next-line no-async-promise-executor
      async (resolve, reject) => {
        cp.exec(
          `${await this.phpPath()} -r "echo extension_loaded('phar');"`,
          (err, stdout, stderr) => {
            resolve(stdout === "1");
          }
        );
      }
    ));
  }

  public async phpPath(): Promise<string | undefined> {
    if (this.phpPathCache) {
      return this.phpPathCache;
    }

    const config = vscode.workspace.getConfiguration("phpunit");
    try {
      this.phpPathCache = await cmdExists(config.get<string>("php")!);
    } catch (e) {
      try {
        this.phpPathCache = await cmdExists("php");
      } catch (e) {
        // Continue regardless of error
      }
    }
    return this.phpPathCache;
  }

  public async phpUnitPath(): Promise<string> {
    if (this.phpUnitPharPathCache) {
      return this.phpUnitPharPathCache;
    }

    const findInWorkspace = async (): Promise<string | undefined> => {
      const uris = await vscode.workspace.findFiles(
        "**/phpunit*.phar",
        "**/node_modules/**",
        1
      );
      this.phpUnitPharPathCache =
        uris && uris.length > 0 ? uris[0].fsPath : undefined;

      return this.phpUnitPharPathCache;
    };

    const config = vscode.workspace.getConfiguration("phpunit");
    const phpUnitPath = config.get<string>("phpunit");
    if (phpUnitPath && phpUnitPath.endsWith(".phar")) {
      this.phpUnitPharPathCache = await new Promise<string>(
        (resolve, reject) => {
          fs.exists(phpUnitPath, exists => {
            if (exists) {
              resolve(phpUnitPath);
            } else {
              reject();
            }
          });
        }
      ).catch(findInWorkspace);
    } else {
      this.phpUnitPharPathCache = await findInWorkspace();
    }

    this.phpUnitPharPathCache = this.phpUnitPharPathCache
      ? `'${this.phpUnitPharPathCache}'`
      : this.phpUnitPharPathCache;

    return this.phpUnitPharPathCache!;
  }
}
