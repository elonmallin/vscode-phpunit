import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as escapeRegexp from 'escape-string-regexp';
import PhpUnitDriverInterface from './PhpUnitDriverInterface';

export default class Legacy implements PhpUnitDriverInterface {
    name: string = 'Legacy';
    _phpPath: string;

    public async run(channel: vscode.OutputChannel, args: string[]) {
        const execPath = await this.execPath();

        // Write the command that we're running to the output.
        const trimmedExecString = [execPath].concat(args).join(' ').replace(new RegExp(escapeRegexp(vscode.workspace.rootPath), 'ig'), '.');
        channel.appendLine(trimmedExecString);

        return cp.spawn(execPath, args, { cwd: vscode.workspace.rootPath });
    }

    public async isInstalled(): Promise<boolean> {
        return await this.execPath() != null;
    }

    async execPath(): Promise<string> {
        if (this._phpPath)
        {
            return this._phpPath;
        }

        const config = vscode.workspace.getConfiguration('phpunit');
        
        return this._phpPath = config.get<string>('execPath');
    }
}