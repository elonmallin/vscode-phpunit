import * as cmdExists from "command-exists";
import * as os from "os";
import * as vscode from "vscode";
import { IRunConfig } from "../RunConfig";
import IPhpUnitDriver from "./IPhpUnitDriver";

export default class GlobalPhpUnit implements IPhpUnitDriver {
  public name: string = "GlobalPhpUnit";
  private phpUnitPathCache: string;

  public async run(args: string[]): Promise<IRunConfig> {
    const execPath = await this.phpUnitPath();

    const command = `${execPath} ${args.join(" ")}`;

    return {
      command: command
    };
  }

  public async isInstalled(): Promise<boolean> {
    return (await this.phpUnitPath()) != null;
  }

  public async phpUnitPath(): Promise<string> {
    if (this.phpUnitPathCache) {
      return this.phpUnitPathCache;
    }

    try {
      this.phpUnitPathCache =
        os.platform() === "win32"
          ? await cmdExists("phpunit.bat")
          : await cmdExists("phpunit");
    } catch (e) {}

    return this.phpUnitPathCache;
  }
}
