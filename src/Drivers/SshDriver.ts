import * as vscode from "vscode";
import { RunConfig } from "../RunConfig";
import PhpUnitDriverInterface from "./PhpUnitDriverInterface";

export default class Ssh implements PhpUnitDriverInterface {
  public name: string = "Ssh";
  public run(args: string[]): Promise<RunConfig> {
    throw new Error("Method not implemented.");
  }
  public async isInstalled(): Promise<boolean> {
    return false;
  }

  public phpUnitPath(): Promise<string> {
    throw new Error("Method not implemented.");
  }
}
