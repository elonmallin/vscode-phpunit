import { IRunConfig } from "../RunConfig";

interface IPhpUnitDriver {
  name: string;
  run(args: string[]): Promise<IRunConfig>;
  isInstalled(): Promise<boolean>;
  phpUnitPath(): Promise<string>;
}

export default IPhpUnitDriver;
