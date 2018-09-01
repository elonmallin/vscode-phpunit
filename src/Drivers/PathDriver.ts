import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as cmdExists from 'command-exists';
import * as escapeRegexp from 'escape-string-regexp';
import PhpUnitDriverInterface from './PhpUnitDriverInterface';

export default class Path implements PhpUnitDriverInterface {
    name: string = 'Path';
    private _phpPath: string;
    private _phpUnitPath: string;

    public async run(channel: vscode.OutputChannel, args: string[]): Promise<cp.ChildProcess> {
        const execPath = await this.phpPath();
        const execArgs = [await this.phpUnitPath()].concat(args);

        // Write the command that we're running to the output.
        const trimmedExecString = [execPath].concat(execArgs).join(' ').replace(new RegExp(escapeRegexp(vscode.workspace.rootPath), 'ig'), '.');
        channel.appendLine(trimmedExecString);

        return cp.spawn(execPath, execArgs, { cwd: vscode.workspace.rootPath });
    }

    public async isInstalled(): Promise<boolean> {
        return (await this.phpPath()) != null && (await this.phpUnitPath()) != null;
    }

    async phpPath(): Promise<string> {
        if (this._phpPath)
        {
            return this._phpPath;
        }

        const config = vscode.workspace.getConfiguration('phpunit');
        try
        {
            this._phpPath = await cmdExists(config.get<string>('php'));
        }
        catch (e)
        {
            try
            {
                this._phpPath = await cmdExists('php');
            }
            catch (e)
            {
            }
        }
        
        return this._phpPath;
    }

    async phpUnitPath(): Promise<string> {
        if (this._phpUnitPath)
        {
            return this._phpUnitPath;
        }

        const config = vscode.workspace.getConfiguration('phpunit');
        const phpUnitPath = config.get<string>('phpunit');
        return !phpUnitPath
            ? null
            : new Promise<string>((resolve, reject) => {
                try
                {
                    fs.exists(phpUnitPath, (exists) => {
                        if (exists)
                        {
                            this._phpUnitPath = phpUnitPath;
                            resolve(this._phpUnitPath);
                        }
                        else
                        {
                            const absPhpUnitPath = path.join(vscode.workspace.rootPath, phpUnitPath)
                            fs.exists(absPhpUnitPath, (exists) => {
                                if (exists)
                                {
                                    this._phpUnitPath = absPhpUnitPath;
                                    resolve(this._phpUnitPath);
                                }
                                else
                                {
                                    resolve();
                                }
                            });
                        }
                    });
                }
                catch (e)
                {
                    resolve();
                }
            });
    }
}