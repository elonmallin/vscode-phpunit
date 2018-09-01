import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as os from 'os';
import * as cmdExists from 'command-exists';
import * as escapeRegexp from 'escape-string-regexp';
import PhpUnitDriverInterface from './PhpUnitDriverInterface';

export default class GlobalPhpUnit implements PhpUnitDriverInterface {
    name: string = 'GlobalPhpUnit';
    private _phpUnitPath: string;

    public async run(channel: vscode.OutputChannel, args: string[]): Promise<cp.ChildProcess> {
        const execPath = await this.phpUnitPath();

        // Write the command that we're running to the output.
        const trimmedExecString = [execPath].concat(args).join(' ').replace(new RegExp(escapeRegexp(vscode.workspace.rootPath), 'ig'), '.');
        channel.appendLine(trimmedExecString);

        return cp.spawn(execPath, args, { cwd: vscode.workspace.rootPath });
    }

    public async isInstalled(): Promise<boolean> {
        return (await this.phpUnitPath()) != null;
    }

    async phpUnitPath(): Promise<string> {
        if (this._phpUnitPath)
        {
            return this._phpUnitPath;
        }

        try
        {
            this._phpUnitPath = os.platform() == 'win32'
                ? await cmdExists('phpunit.bat')
                : await cmdExists('phpunit');
        }
        catch (e)
        {
        }

        return this._phpUnitPath;
    }
}