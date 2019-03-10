import * as vscode from "vscode";
import { RunConfig } from "../RunConfig";
import PhpUnitDriverInterface from "./PhpUnitDriverInterface";
import { resolvePhpUnitPath } from "./PhpUnitResolver";

export default class Command implements PhpUnitDriverInterface {
  public name: string = "Command";
  private _command: string;
  private _phpUnitPath: string;

  public async run(args: string[]): Promise<RunConfig> {
    args = [await this.phpUnitPath()].concat(args);
    const command = `${await this.command()} ${args.join(" ")}`;

    return {
      command: command,
      problemMatcher: "$phpunit-app"
    };
  }

  public async isInstalled(): Promise<boolean> {
    return (await this.command()) != null && (await this.phpUnitPath()) != null;
  }

  public async command(): Promise<string> {
    return (
      this._command ||
      (this._command = vscode.workspace
        .getConfiguration("phpunit")
        .get<string>("command"))
    );
  }

  public async phpUnitPath(): Promise<string> {
    return (
      this._phpUnitPath ||
      (this._phpUnitPath = vscode.workspace
        .getConfiguration("phpunit")
        .get<string>("phpunit")) ||
      (this._phpUnitPath = await resolvePhpUnitPath())
    );
  }
}
