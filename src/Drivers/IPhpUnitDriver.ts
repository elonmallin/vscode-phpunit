import * as vscode from "vscode";
import { IRunConfig } from "../RunConfig";

export default interface IPhpUnitDriver {
  name: string;
  run(args: string[]): Promise<IRunConfig>;
  isInstalled(): Promise<boolean>;
  phpUnitPath(): Promise<string>;
}
