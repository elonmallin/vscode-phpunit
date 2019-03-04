import * as vscode from 'vscode';
import * as cmdExists from 'command-exists';
import * as DockerCmdUtils from '../DockerCmdUtils';
import PhpUnitDriverInterface from './PhpUnitDriverInterface';
import { RunConfig } from '../RunConfig';
import { resolvePhpUnitPath } from './PhpUnitResolver';

export default class DockerContainer implements PhpUnitDriverInterface {
    name: string = 'DockerContainer';
    private _phpUnitPath: string;
    private dockerContainer: string;

    async run(args: string[]): Promise<RunConfig> {
        args = ['exec', '-t', this.dockerContainer, 'php', await this.phpUnitPath()]
            .concat(args);

        const command = `docker ${args.join(' ').replace(/\\/ig, '/')}`;

        return {
            command: command,
            problemMatcher: '$phpunit-app'
        };
    }

    public async isInstalled(): Promise<boolean> {
        try {
            const config = vscode.workspace.getConfiguration('phpunit');
            const pathMappings = config.get<string>('paths');
            this.dockerContainer = config.get<string>('docker.container');

            if (!this.dockerContainer && pathMappings) {
                const containers = await DockerCmdUtils.default.container.ls();

                if (containers.length > 0) {
                    this.dockerContainer = await vscode.window.showQuickPick(
                        containers.map(r => r.NAMES),
                        { placeHolder: 'Pick a running docker container to run phpunit test in.' });
                    
                    if (!this.dockerContainer) {
                        vscode.window.showInformationMessage(`No docker container selected. Skipping ${this.name} driver.`);
                    }
                }
            }

            return this.dockerContainer
                && pathMappings
                && (await cmdExists('docker') != null)
                && (await this.phpUnitPath() != null);
        }
        catch (e) {
            return false;
        }
    }

    async phpUnitPath(): Promise<string> {
        return this._phpUnitPath
            || (this._phpUnitPath = await resolvePhpUnitPath());
    }

    async tryFindRunningDockerContainer(): Promise<string> {
        const findInWorkspace = async (): Promise<string> => {
            const uris = await vscode.workspace.findFiles('**/dockerfile', '**/node_modules/**', 1);
            return uris && uris.length > 0 ? uris[0].fsPath : null;
        }

        const uris = await vscode.workspace.findFiles('**/dockerfile', '**/node_modules/**', 1);
        const dockerfile = uris && uris.length > 0 ? uris[0].fsPath : null;

        if (dockerfile) {
            // Parse running docker file
        }

        return null;
    }
}