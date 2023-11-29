import * as vscode from "vscode";
import { IRunConfig } from "../RunConfig";
import IPhpUnitDriver from "./IPhpUnitDriver";

export default class Legacy implements IPhpUnitDriver {
  public name = "Legacy";
  public phpPathCache?: string;

  public async run(args: string[]): Promise<IRunConfig> {
    const execPath = await this.execPath();

    const command = `${execPath} ${args.join(" ")}`;

    return {
      command: command,
      exec: execPath,
      args: args,
    };
  }

  public async isInstalled(): Promise<boolean> {
    return !!(await this.execPath());
  }

  public async execPath(): Promise<string> {
    if (this.phpPathCache) {
      return this.phpPathCache;
    }

    const config = vscode.workspace.getConfiguration("phpunit");

    return (this.phpPathCache = config.get<string>("execPath")!);
  }

  public async phpUnitPath(): Promise<string> {
    throw new Error("Method not implemented.");
  }
}
