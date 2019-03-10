import { IRunConfig } from "../RunConfig";
import IPhpUnitDriver from "./IPhpUnitDriver";

export default class Ssh implements IPhpUnitDriver {
  public name: string = "Ssh";
  public run(args: string[]): Promise<IRunConfig> {
    throw new Error("Method not implemented.");
  }
  public async isInstalled(): Promise<boolean> {
    return false;
  }

  public phpUnitPath(): Promise<string> {
    throw new Error("Method not implemented.");
  }
}
