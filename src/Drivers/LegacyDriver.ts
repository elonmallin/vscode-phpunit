import * as vscode from "vscode";
import { RunConfig } from "../RunConfig";
import PhpUnitDriverInterface from "./PhpUnitDriverInterface";

export default class Legacy implements PhpUnitDriverInterface {
  public name: string = "Legacy";
  public _phpPath: string;

  public async run(args: string[]): Promise<RunConfig> {
    const execPath = await this.execPath();

    const command = `${execPath} ${args.join(" ")}`;

    return {
      command: command
    };
  }

  public async isInstalled(): Promise<boolean> {
    return (await this.execPath()) != null;
  }

  public async execPath(): Promise<string> {
    if (this._phpPath) {
      return this._phpPath;
    }

    const config = vscode.workspace.getConfiguration("phpunit");

    return (this._phpPath = config.get<string>("execPath"));
  }

  public async phpUnitPath(): Promise<string> {
    throw new Error("Method not implemented.");
  }
}
