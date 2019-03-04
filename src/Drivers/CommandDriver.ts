import * as vscode from 'vscode';
import PhpUnitDriverInterface from './PhpUnitDriverInterface';
import { RunConfig } from '../RunConfig';
import { resolvePhpUnitPath } from './PhpUnitResolver';

export default class Command implements PhpUnitDriverInterface {
    name: string = 'Command';
    private _phpPath: string;
    private _phpUnitPath: string;

    public async run(args: string[]): Promise<RunConfig> {
        const phpPath = await this.phpPath();
        args = [await this.phpUnitPath()].concat(args);

        const command = `${phpPath} ${args.join(' ')}`;

        return {
            command: command
        };
    }

    public async isInstalled(): Promise<boolean> {
        return (await this.phpPath()) != null && (await this.phpUnitPath()) != null;
    }

    async phpPath(): Promise<string> {
        return this._phpPath
            || (this._phpPath = vscode.workspace.getConfiguration('phpunit').get<string>('php'));
    }

    async phpUnitPath(): Promise<string> {
        return this._phpUnitPath
            || (this._phpUnitPath = await resolvePhpUnitPath());
    }
}