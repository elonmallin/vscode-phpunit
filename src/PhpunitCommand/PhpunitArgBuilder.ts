import escapeStringRegexp from "../Utils/escape-string-regexp";

export class PhpunitArgBuilder {
  private directoryOrFiles: Array<string> = [];
  private suites: Array<string> = [];
  private filter?: string;
  private groups: Array<string> = [];
  private configFile?: string;
  private color?: string;
  private args: Array<string> = [];
  private pathMappings?: { [key: string]: string };
  private workspaceFolder?: string;

  public addDirectoryOrFile(directoryOrFile: string): PhpunitArgBuilder {
    this.directoryOrFiles.push(directoryOrFile.replace(/\\/gi, "/"));

    return this;
  }

  public addSuite(suiteName: string): PhpunitArgBuilder {
    this.suites.push(suiteName);

    return this;
  }

  public addSuites(suiteNames: Array<string>): PhpunitArgBuilder {
    this.suites.push(...suiteNames);

    return this;
  }

  public withFilter(filter: string): PhpunitArgBuilder {
    this.filter = filter;

    return this;
  }

  public addGroup(group: string): PhpunitArgBuilder {
    this.groups.push(group);

    return this;
  }

  public addGroups(groups: Array<string>): PhpunitArgBuilder {
    this.groups.push(...groups);

    return this;
  }

  public withConfig(configFile: string): PhpunitArgBuilder {
    this.configFile = configFile.replace(/\\/gi, "/");

    return this;
  }

  public withColors(color: "never" | "auto" | "always"): PhpunitArgBuilder {
    this.color = color;

    return this;
  }

  public addArgs(args: string[]): PhpunitArgBuilder {
    this.args.push(...args);

    return this;
  }

  public withPathMappings(
    pathMappings: { [key: string]: string },
    workspaceFolder: string,
  ): PhpunitArgBuilder {
    this.pathMappings = pathMappings;
    this.workspaceFolder = workspaceFolder;

    return this;
  }

  public buildArgs(): Array<string> {
    let args = [
      ...(this.configFile ? ["--configuration", this.configFile] : []),
      ...(this.color ? [`--colors=${this.color}`] : []),
      ...(this.suites.length > 0 ? ["--testsuite", this.suites.join(",")] : []),
      ...(this.filter ? ["--filter", `'${this.filter}'`] : []),
      ...(this.groups.length > 0 ? ["--group", this.groups.join(",")] : []),
      ...this.args,
      ...this.directoryOrFiles,
    ].filter((part) => part);

    if (this.pathMappings) {
      for (const key of Object.keys(this.pathMappings)) {
        const localPath = key
          .replace(/\$\{workspaceFolder\}/gi, this.workspaceFolder!)
          .replace(/\\/gi, "/");
        const remotePath = this.pathMappings[key];

        args = args.map((arg) =>
          arg.replace(
            new RegExp(escapeStringRegexp(localPath), "ig"),
            remotePath,
          ),
        );
      }
    }

    return args.filter((part) => part);
  }

  public build(): string {
    return this.buildArgs().join(" ");
  }
}
