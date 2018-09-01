import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as cmdExists from 'command-exists';
import * as escapeRegexp from 'escape-string-regexp';
import PhpUnitDriverInterface from './PhpUnitDriverInterface';

export default class Phar implements PhpUnitDriverInterface {
    name: string = 'Phar';
    _phpPath: string;
    _phpUnitPharPath: string;
    _hasPharExtension: boolean;

    public async run(channel: vscode.OutputChannel, args: string[]): Promise<cp.ChildProcess> {
        const execPath = await this.phpPath();
        const execArgs = [await this.phpUnitPharPath()].concat(args);

        // Write the command that we're running to the output.
        const trimmedExecString = [execPath].concat(execArgs).join(' ').replace(new RegExp(escapeRegexp(vscode.workspace.rootPath), 'ig'), '.');
        channel.appendLine(trimmedExecString);

        return cp.spawn(execPath, execArgs, { cwd: vscode.workspace.rootPath });
    }

    public async isInstalled(): Promise<boolean> {
        return (await this.phpPath() != null) &&
            (await this.hasPharExtension()) &&
            (await this.phpUnitPharPath() != null);
    }

    async hasPharExtension(): Promise<boolean> {
        if (this._hasPharExtension)
        {
            return this._hasPharExtension;
        }

        return this._hasPharExtension = await new Promise<boolean>(async (resolve, reject) => {
            cp.exec(`${await this.phpPath()} -r "echo extension_loaded('phar');"`, (err, stdout, stderr) => {
                resolve(stdout == '1');
            });
        });
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

    async phpUnitPharPath(): Promise<string> {
        if (this._phpUnitPharPath)
        {
            return this._phpUnitPharPath;
        }

        const findInWorkspace = async (): Promise<string> => {
            const uris = await vscode.workspace.findFiles('**/phpunit*.phar', '**/node_modules/**', 1);
            this._phpUnitPharPath = uris && uris.length > 0 ? uris[0].fsPath : null;

            return this._phpUnitPharPath;
        }

        const config = vscode.workspace.getConfiguration('phpunit');
        let phpUnitPath = config.get<string>('phpunit');
        if (phpUnitPath && phpUnitPath.endsWith('.phar'))
        {
            return new Promise<string>((resolve, reject) => {
                fs.exists(phpUnitPath, (exists) => {
                    if (exists)
                    {
                        this._phpUnitPharPath = phpUnitPath;
                        resolve(this._phpUnitPharPath);
                    }
                    else
                    {
                        reject();
                    }
                });
            })
            .catch(findInWorkspace);
        }

        return await findInWorkspace();
    }
}