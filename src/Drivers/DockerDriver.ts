import * as vscode from 'vscode';
import * as cmdExists from 'command-exists';
import * as escapeRegexp from 'escape-string-regexp';
import PhpUnitDriverInterface from './PhpUnitDriverInterface';
import Composer from './ComposerDriver';
import Phar from './PharDriver';
import GlobalPhpUnit from './GlobalPhpUnitDriver';
import Path from './PathDriver';
import { ExtensionBootstrapBridge } from '../ExtensionBootstrapBridge';

export default class Docker implements PhpUnitDriverInterface {
    name: string = 'Docker';
    private _phpUnitPath: string;

    async run(channel: vscode.OutputChannel, args: string[], bootstrapBridge: ExtensionBootstrapBridge) {
        args = ['run', '--rm', '-t', '-v', '${pwd}:/app', '-w', '/app', 'php', 'php', await this.phpUnitPath()]
            .concat(args)
            .join(' ')
            .replace(new RegExp(escapeRegexp(vscode.workspace.rootPath), 'ig'), '/app')
            .replace(new RegExp(escapeRegexp('\\'), 'ig'), '/')
            .replace(new RegExp(escapeRegexp('${pwd}'), 'ig'), vscode.workspace.rootPath)
            .split(' ');

        const command = `docker ${args.join(' ')}`;
        channel.appendLine(command);

        bootstrapBridge.setTaskCommand(command, '$phpunit-docker');
        await vscode.commands.executeCommand('workbench.action.tasks.runTask', 'phpunit: run');
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

        const config = vscode.workspace.getConfiguration('phpunit');
        const order = config.get<string[]>('driverPriority');
        const drivers = await this.getDrivers(order);

        for (let driver of drivers) {
            this._phpUnitPath = await driver.phpUnitPath();
            if (this._phpUnitPath) {
                return this._phpUnitPath;
            }
        }

        return null;
    }

    getDrivers(order?: string[]): PhpUnitDriverInterface[] {
        const drivers: PhpUnitDriverInterface[] = [
            new Path(),
            new Composer(),
            new Phar(),
            new GlobalPhpUnit(),
        ];

        function arrayUnique(array) {
            var a = array.concat();
            for(var i=0; i<a.length; ++i) {
                for(var j=i+1; j<a.length; ++j) {
                    if(a[i] === a[j])
                        a.splice(j--, 1);
                }
            }
        
            return a;
        }
        order = arrayUnique((order || []).concat(drivers.map(d => d.name)));

        const sortedDrivers = drivers.sort((a, b) => {
            return order.indexOf(a.name) - order.indexOf(b.name);
        });

        return sortedDrivers;
    }
}