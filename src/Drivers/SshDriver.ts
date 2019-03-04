import * as vscode from 'vscode';
import PhpUnitDriverInterface from './PhpUnitDriverInterface';
import { RunConfig } from '../RunConfig';

export default class Ssh implements PhpUnitDriverInterface {
    name: string = 'Ssh';
    run(args: string[]): Promise<RunConfig> {
        throw new Error("Method not implemented.");
    }
    public async isInstalled(): Promise<boolean> {
        return false;
    }

    phpUnitPath(): Promise<string> {
        throw new Error("Method not implemented.");
    }
}