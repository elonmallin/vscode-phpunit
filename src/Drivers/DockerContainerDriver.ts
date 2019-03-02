import * as vscode from 'vscode';
import * as cmdExists from 'command-exists';
import * as escapeRegexp from 'escape-string-regexp';
import PhpUnitDriverInterface from './PhpUnitDriverInterface';
import Composer from './ComposerDriver';
import Phar from './PharDriver';
import GlobalPhpUnit from './GlobalPhpUnitDriver';
import Path from './PathDriver';
import { RunConfig } from '../RunConfig';

export default class DockerContainer implements PhpUnitDriverInterface {
    name: string = 'DockerContainer';
    private _phpUnitPath: string;

    async run(channel: vscode.OutputChannel, args: string[]): Promise<RunConfig> {
        const config = vscode.workspace.getConfiguration('phpunit');
        const dockerContainer = config.get<string>('docker.container');
        const pathMappings = config.get<string>('paths');

        args = ['exec', '-t', dockerContainer, 'php', await this.phpUnitPath()]
            .concat(args);

        let argsString = args.join(' ').replace(/\\/ig, '/');
        if (pathMappings) {
            for (let key of Object.keys(pathMappings)) {
                const localPath = key
                    .replace(/\$\{workspaceFolder\}/ig, vscode.workspace.rootPath)
                    .replace(/\\/ig, '/');
                    
                argsString = argsString
                    .replace(new RegExp(escapeRegexp(localPath), 'ig'), pathMappings[key]);
            }
        }

        const command = `docker ${argsString}`;
        channel.appendLine(command);

        return {
            command: command,
            problemMatcher: '$phpunit-docker'
        };
    }

    public async isInstalled(): Promise<boolean> {
        try {
            const config = vscode.workspace.getConfiguration('phpunit');
            const dockerContainer = config.get<string>('docker.container');
            const pathMappings = config.get<string>('paths');

            return dockerContainer
                && pathMappings
                && (await cmdExists('docker') != null)
                && (await this.phpUnitPath() != null);
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