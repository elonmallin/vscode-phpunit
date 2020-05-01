import * as cmdExists from "command-exists";
import * as vscode from "vscode";
import * as DockerCmdUtils from "../DockerCmdUtils";
import { IRunConfig } from "../RunConfig";
import IPhpUnitDriver from "./IPhpUnitDriver";
import { resolvePhpUnitPath } from "./PhpUnitResolver";

export default class DockerContainer implements IPhpUnitDriver {
  public name: string = "DockerContainer";
  private phpUnitPathCache: string;
  private dockerContainer: string;

  public async run(args: string[]): Promise<IRunConfig> {
    args = [
      "exec",
      "-t",
      this.dockerContainer,
      "php",
      await this.phpUnitPath()
    ].concat(args);

    const command = `docker ${args.join(" ").replace(/\\/gi, "/")}`;

    return {
      command: command,
      problemMatcher: "$phpunit-app"
    };
  }

  public async isInstalled(): Promise<boolean> {
    try {
      const config = vscode.workspace.getConfiguration("phpunit");
      const pathMappings = config.get<string>("paths");
      this.dockerContainer = config.get<string>("docker.container");

      if (!this.dockerContainer && pathMappings) {
        const containers = await DockerCmdUtils.default.container.ls();

        if (containers.length > 0) {
          this.dockerContainer = await vscode.window.showQuickPick(
            containers.map(r => r.NAMES),
            {
              placeHolder:
                "Pick a running docker container to run phpunit test in..."
            }
          );

          if (!this.dockerContainer) {
            vscode.window.showInformationMessage(
              `No docker container selected. Skipping ${this.name} driver.`
            );
          }
        }
      }

      return !!(
        this.dockerContainer &&
        pathMappings &&
        (await cmdExists("docker")) &&
        (await this.phpUnitPath())
      );
    } catch (e) {
      return false;
    }
  }

  public async phpUnitPath(): Promise<string> {
    return (
      this.phpUnitPathCache ||
      (this.phpUnitPathCache = await resolvePhpUnitPath())
    );
  }
}
