import * as vscode from 'vscode';
import { ExtensionBootstrapBridge } from '../ExtensionBootstrapBridge';

export default interface PhpUnitDriverInterface {
    run(channel: vscode.OutputChannel, args: string[], bootstrapBridge: ExtensionBootstrapBridge);
    isInstalled(): Promise<boolean>;
    phpUnitPath(): Promise<string>;
    name: string;
}