import * as vscode from 'vscode';
import { RunConfig } from '../RunConfig';

export default interface PhpUnitDriverInterface {
    run(args: string[]): Promise<RunConfig>;
    isInstalled(): Promise<boolean>;
    phpUnitPath(): Promise<string>;
    name: string;
}