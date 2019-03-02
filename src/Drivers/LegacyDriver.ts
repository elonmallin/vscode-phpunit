import * as vscode from 'vscode';
import PhpUnitDriverInterface from './PhpUnitDriverInterface';
import { RunConfig } from '../RunConfig';

export default class Legacy implements PhpUnitDriverInterface {
    name: string = 'Legacy';
    _phpPath: string;

    public async run(channel: vscode.OutputChannel, args: string[]): Promise<RunConfig> {
        const execPath = await this.execPath();

        const command = `${execPath} ${args.join(' ')}`;
        channel.appendLine(command);

        return {
            command: command
        };
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

    async phpUnitPath(): Promise<string> {
        throw new Error("Method not implemented.");
    }
}