import * as vscode from 'vscode';
import * as os from 'os';
import * as cmdExists from 'command-exists';
import PhpUnitDriverInterface from './PhpUnitDriverInterface';
import { RunConfig } from '../RunConfig';

export default class GlobalPhpUnit implements PhpUnitDriverInterface {
    name: string = 'GlobalPhpUnit';
    private _phpUnitPath: string;

    public async run(args: string[]): Promise<RunConfig> {
        const execPath = await this.phpUnitPath();

        const command = `${execPath} ${args.join(' ')}`;

        return {
            command: command
        };
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