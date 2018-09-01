import * as vscode from 'vscode';

export default interface PhpUnitDriverInterface {
    run(channel: vscode.OutputChannel, args: string[]);
    isInstalled(): Promise<boolean>;
    name: string;
}