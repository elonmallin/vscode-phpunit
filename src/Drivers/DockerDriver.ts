import * as vscode from 'vscode';
import PhpUnitDriverInterface from './PhpUnitDriverInterface';

export default class Docker implements PhpUnitDriverInterface {
    name: string = 'Docker';
    run(channel: vscode.OutputChannel, args: string[]) {
        throw new Error("Method not implemented.");
    }
    public async isInstalled(): Promise<boolean> {
        return false;
    }
}