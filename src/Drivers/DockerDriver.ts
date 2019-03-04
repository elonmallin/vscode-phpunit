import * as vscode from 'vscode';
import * as cmdExists from 'command-exists';
import * as escapeRegexp from 'escape-string-regexp';
import PhpUnitDriverInterface from './PhpUnitDriverInterface';
import { RunConfig } from '../RunConfig';
import { resolvePhpUnitPath } from './PhpUnitResolver';

export default class Docker implements PhpUnitDriverInterface {
    name: string = 'Docker';
    private _phpUnitPath: string;

    async run(args: string[]): Promise<RunConfig> {
        const config = vscode.workspace.getConfiguration('phpunit');
        const dockerImage = config.get<string>('docker.image') || 'php';

        args = ['run', '--rm', '-t', '-v', '${pwd}:/app', '-w', '/app', dockerImage, 'php', await this.phpUnitPath()]
            .concat(args)
            .join(' ')
            .replace(new RegExp(escapeRegexp(vscode.workspace.rootPath), 'ig'), '/app')
            .replace(/\\/ig, '/')
            .split(' ');

        const command = `docker ${args.join(' ')}`;

        return {
            command: command,
            problemMatcher: '$phpunit-docker'
        };
    }

    public async isInstalled(): Promise<boolean> {
        try {
            let dockerExists = await cmdExists('docker') != null;
            return dockerExists && (await this.phpUnitPath() != null);
        }
        catch (e) {
            return false;
        }
    }

    async phpUnitPath(): Promise<string> {
        return this._phpUnitPath
            || (this._phpUnitPath = await resolvePhpUnitPath());
    }
}