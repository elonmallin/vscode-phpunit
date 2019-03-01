import * as vscode from 'vscode';
import * as os from 'os';
import * as cmdExists from 'command-exists';
import PhpUnitDriverInterface from './PhpUnitDriverInterface';
import { ExtensionBootstrapBridge } from '../ExtensionBootstrapBridge';

export default class GlobalPhpUnit implements PhpUnitDriverInterface {
    name: string = 'GlobalPhpUnit';
    private _phpUnitPath: string;

    public async run(channel: vscode.OutputChannel, args: string[], bootstrapBridge: ExtensionBootstrapBridge) {
        const execPath = await this.phpUnitPath();

        const command = `${execPath} ${args.join(' ')}`;
        channel.appendLine(command);

        bootstrapBridge.setTaskCommand(command);
        await vscode.commands.executeCommand('workbench.action.tasks.runTask', 'phpunit: run');
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