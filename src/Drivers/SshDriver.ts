import * as vscode from "vscode";
import { IRunConfig } from "../RunConfig";
import IPhpUnitDriver from "./IPhpUnitDriver";
import { resolvePhpUnitPath } from "./PhpUnitResolver";

export default class Ssh implements IPhpUnitDriver {
  public name = "Ssh";
  private phpPathCache?: string;
  private phpUnitPathCache?: string;
  private ssh?: string;

  public async run(args: string[]): Promise<IRunConfig> {
    const argsString = `${this.phpPathCache} ${this.phpUnitPathCache} ${args.join(" ")}`;

    return {
      command: `${this.ssh!.replace("<command>", argsString)}`,
      // TODO: ssh might be more than the ssh executable here, so we need to split it up.
      exec: this.ssh!,
      args: args,
    };
  }

  public async isInstalled(): Promise<boolean> {
    const config = vscode.workspace.getConfiguration("phpunit");
    this.ssh = config.get<string>("ssh");

    return !!(this.ssh && (await this.phpPath()) && (await this.phpUnitPath()));
  }

  public async phpPath(): Promise<string> {
    if (this.phpPathCache) {
      return this.phpPathCache;
    }

    const config = vscode.workspace.getConfiguration("phpunit");
    this.phpPathCache = config.get<string>("php", "php"); // Use default `php` for this driver since we probably can assume `php` is on path.

    return this.phpPathCache;
  }

  public async phpUnitPath(): Promise<string> {
    if (this.phpUnitPathCache) {
      return this.phpUnitPathCache;
    }

    const config = vscode.workspace.getConfiguration("phpunit");
    this.phpUnitPathCache = config.get<string>("phpunit");

    return (
      this.phpUnitPathCache ||
      (this.phpUnitPathCache = await resolvePhpUnitPath())
    );
  }
}
