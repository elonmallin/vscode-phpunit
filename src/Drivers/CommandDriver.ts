import * as vscode from "vscode";
import { IRunConfig } from "../RunConfig";
import IPhpUnitDriver from "./IPhpUnitDriver";
import { resolvePhpUnitPath } from "./PhpUnitResolver";

export default class Command implements IPhpUnitDriver {
  public name: string = "Command";
  private commandCache: string;
  private phpUnitPathCache: string;

  public async run(args: string[]): Promise<IRunConfig> {
    args = [await this.phpUnitPath()].concat(args);
    const command = `${await this.command()} ${args.join(" ")}`;

    return {
      command: command,
      problemMatcher: "$phpunit-app"
    };
  }

  public async isInstalled(): Promise<boolean> {
    return !!((await this.command()) && (await this.phpUnitPath()));
  }

  public async command(): Promise<string> {
    return (
      this.commandCache ||
      (this.commandCache = vscode.workspace
        .getConfiguration("phpunit")
        .get<string>("command"))
    );
  }

  public async phpUnitPath(): Promise<string> {
    return (
      this.phpUnitPathCache ||
      (this.phpUnitPathCache = vscode.workspace
        .getConfiguration("phpunit")
        .get<string>("phpunit")) ||
      (this.phpUnitPathCache = await resolvePhpUnitPath())
    );
  }
}
