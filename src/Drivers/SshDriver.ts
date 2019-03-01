import * as vscode from 'vscode';
import PhpUnitDriverInterface from './PhpUnitDriverInterface';

export default class Ssh implements PhpUnitDriverInterface {
    name: string = 'Ssh';
    run(channel: vscode.OutputChannel, args: string[]) {
        throw new Error("Method not implemented.");
    }
    public async isInstalled(): Promise<boolean> {
        return false;
    }

    phpUnitPath(): Promise<string> {
        throw new Error("Method not implemented.");
    }
}