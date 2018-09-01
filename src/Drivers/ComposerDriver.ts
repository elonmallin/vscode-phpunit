import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as cmdExists from 'command-exists';
import * as escapeRegexp from 'escape-string-regexp';
import PhpUnitDriverInterface from './PhpUnitDriverInterface';

export default class Composer implements PhpUnitDriverInterface {
    name: string = 'Composer';
    private _phpPath: string;
    private _phpUnitPath: string;

    public async run(channel: vscode.OutputChannel, args: string[]): Promise<cp.ChildProcess> {
        let execPath = await this.phpUnitPath();
        let execArgs = args.slice();

        if (os.platform() == 'win32')
        {
            execPath = await this.phpPath();
            execArgs = [await this.phpUnitPath()].concat(args);
        }
        
        // Write the command that we're running to the output.
        const trimmedExecString = [execPath].concat(execArgs).join(' ').replace(new RegExp(escapeRegexp(vscode.workspace.rootPath), 'ig'), '.');
        channel.appendLine(trimmedExecString);

        return cp.spawn(execPath, execArgs, { cwd: vscode.workspace.rootPath });
    }

    public async isInstalled(): Promise<boolean> {
        return (await this.phpPath()) != null && (await this.phpUnitPath() != null);
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

        const findInWorkspace = async (): Promise<string> => {
            const uris = os.platform() == 'win32'
                ? await vscode.workspace.findFiles('**/vendor/phpunit/phpunit/phpunit', '**/node_modules/**', 1)
                : await vscode.workspace.findFiles('**/vendor/bin/phpunit', '**/node_modules/**', 1);

            return this._phpUnitPath = (uris && uris.length > 0 ? uris[0].fsPath : null);
        }

        const config = vscode.workspace.getConfiguration('phpunit');
        const phpUnitPath = config.get<string>('phpunit');
        if (phpUnitPath)
        {
            return new Promise<string>((resolve, reject) => {
                fs.exists(phpUnitPath, (exists) => {
                    if (exists)
                    {
                        this._phpUnitPath = phpUnitPath;
                        resolve(this._phpUnitPath);
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