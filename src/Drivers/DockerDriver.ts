import * as vscode from 'vscode';
import * as cmdExists from 'command-exists';
import * as cp from 'child_process';
import * as escapeRegexp from 'escape-string-regexp';
import PhpUnitDriverInterface from './PhpUnitDriverInterface';
import Composer from './ComposerDriver';
import Phar from './PharDriver';
import GlobalPhpUnit from './GlobalPhpUnitDriver';
import Path from './PathDriver';

export default class Docker implements PhpUnitDriverInterface {
    name: string = 'Docker';
    private _phpUnitPath: string;

    async run(channel: vscode.OutputChannel, args: string[]) {
        const allArgs = ['run', '--rm', '-v', '${pwd}:/app', '-w', '/app', 'php', 'php', await this.phpUnitPath()]
            .concat(args)
            .join(' ')
            .replace(new RegExp(escapeRegexp(vscode.workspace.rootPath), 'ig'), '/app')
            .replace(new RegExp(escapeRegexp('\\'), 'ig'), '/')
            .replace('${pwd}', vscode.workspace.rootPath)
            .split(' ');
        channel.appendLine('docker ' + allArgs.join(' '));

        return cp.spawn('docker', allArgs, { cwd: vscode.workspace.rootPath });
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
        if (this._phpUnitPath)
        {
            return this._phpUnitPath;
        }

        let pathDriver = new Path();
        let composerDriver = new Composer();
        let pharDriver = new Phar();
        let globalPhpUnit = new GlobalPhpUnit();

        this._phpUnitPath = await pathDriver.phpUnitPath()
            || await composerDriver.phpUnitPath()
            || await pharDriver.phpUnitPharPath()
            || await globalPhpUnit.phpUnitPath();

        return this._phpUnitPath;
    }
}