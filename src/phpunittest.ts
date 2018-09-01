'use strict';

import * as vscode from 'vscode';
import cp = require('child_process');
import * as fs from 'fs';
import PhpUnitDriverInterface from './Drivers/PhpUnitDriverInterface';
import PhpUnitDrivers from './Drivers/PhpUnitDrivers';
import parsePhpToObject from './PhpParser';

type RunType = 'test' | 'directory' | 'rerun-last-test' | 'nearest-test';

export class TestRunner {
    lastContextArgs: string[];
    channel: vscode.OutputChannel;
    lastCommand: Command;

    readonly regex = {
        method: /\s*public*\s+function\s+(\w*)\s*\(/gi,
        class: /class\s+(\w*)\s*{?/gi
    };

    constructor(channel) {
        this.channel = channel;
    }

    getClosestMethodAboveActiveLine(editor: vscode.TextEditor): string | null {
        for (let i = editor.selection.active.line; i > 0; --i)
        {
            let line = editor.document.lineAt(i);
            let regexResult = /\s*public*\s+function\s+(\w*)\s*\(/gi.exec(line.text);
    
            if (regexResult)
            {
                return regexResult[1].toString().trim();
            }
        }
    
        return null;
    }
    
    async resolveContextArgs(type: RunType, config): Promise<string[]> {
        let args = [];
        switch (type)
        {
            case 'test':
            {
                const editor = vscode.window.activeTextEditor;
                if (editor)
                {
                    let range = editor.document.getWordRangeAtPosition(editor.selection.active);
                    if (range)
                    {
                        let line = editor.document.lineAt(range.start.line);
                        var wordOnCursor = editor.document.getText(range);
                        var isFunction = line.text.indexOf("function") != -1;
            
                        if (isFunction && wordOnCursor != null)
                        {
                            // Test a specific function in this file
                            args.push(editor.document.uri.fsPath);
                            args.push("--filter");
                            args.push(wordOnCursor);
                            break;
                        }
                        else if (line.text.indexOf("class") != -1)
                        {
                            // The the class.
                            args.push(editor.document.uri.fsPath);
                            break;
                        }
                    }
                    
                    if (!config.preferRunClassTestOverQuickPickWindow)
                    {
                        let testableList = [];
                        // Gather the class and functions to show in the quick pick window.
                        {
                            const closestMethod = this.getClosestMethodAboveActiveLine(editor);
                            if (closestMethod)
                            {
                                testableList.push('function - ' + closestMethod);
                            }
                            
                            const parsedPhpClass = await parsePhpToObject(editor.document.fileName);
                            testableList.push('class - ' + parsedPhpClass.name);
                            testableList = testableList.concat(parsedPhpClass.methods.public.map(m => 'function - ' + m));
                        }
    
                        const selectedTest = await vscode.window.showQuickPick(testableList);
                        if (selectedTest)
                        {
                            if (selectedTest.indexOf('function - ') != -1)
                            {
                                // Test the function.
                                args.push(editor.document.uri.fsPath);
                                args.push("--filter");
                                args.push(selectedTest.replace('function - ', ''));
                                break;
                            }
                            else if (selectedTest.indexOf('class - ') != -1)
                            {
                                // Test the class.
                                args.push(editor.document.uri.fsPath);
                                break;
                            }
                        }
                        else
                        {
                            // Make sure to return null args to indicate that we should not run any test.
                            return null;
                        }
                    }
    
                    // NOTE: No `break` statement here, we will fall-through to `nearest-test`.
                }
                else
                {
                    break;
                }
            }

            case 'nearest-test':
            {
                const editor = vscode.window.activeTextEditor;
                if (editor)
                {
                    const closestMethod = this.getClosestMethodAboveActiveLine(editor);
                    if (closestMethod)
                    {
                        // Test the function.
                        args.push(editor.document.uri.fsPath);
                        args.push("--filter");
                        args.push(closestMethod);
                    }
                    else
                    {
                        console.error('No method found above the cursor. Make sure the cursor is close to a method.');
                    }
                }
                break;
            }
    
            case 'directory':
            {
                const editor = vscode.window.activeTextEditor;
                if (editor)
                {
                    let currentDir = editor.document.uri.fsPath.replace(/(\/|\\)\w*\.php$/i, '');
                    args.push(currentDir);
                }
                else
                {
                    console.error('Please open a file in the directory you want to test.');
                }
                break;
            }
    
            case 'rerun-last-test':
            {
                args = args.concat(this.lastContextArgs.slice());
                break;
            }
        }
    
        return args;
    }

    async getDriver(order?: string[]): Promise<PhpUnitDriverInterface> {
        const drivers: PhpUnitDriverInterface[] = [
            new PhpUnitDrivers.AbsolutePath(),
            new PhpUnitDrivers.Composer(),
            new PhpUnitDrivers.Phar(),
            new PhpUnitDrivers.GlobalPhpUnit(),
            new PhpUnitDrivers.Docker(),
            new PhpUnitDrivers.Ssh(),
            new PhpUnitDrivers.Legacy(),
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

        for (let d of sortedDrivers)
        {
            if (await d.isInstalled())
            {
                return d;
            }
        }
        
        return null;
    }

    async run(type: RunType) {
        const config = vscode.workspace.getConfiguration('phpunit');
        const order = config.get<string[]>('driverPriority');

        const driver = await this.getDriver(order);
        if (driver)
        {
            if (config.get<string>('clearOutputOnRun'))
            {
                this.channel.clear();
            }
            
            const configArgs = config.get<Array<string>>('args', []);
            const preferRunClassTestOverQuickPickWindow = config.get<Boolean>('preferRunClassTestOverQuickPickWindow', false);

            const contextArgs = await this.resolveContextArgs(type, { preferRunClassTestOverQuickPickWindow });
            if (contextArgs)
            {
                this.lastContextArgs = contextArgs;
                const runArgs = this.lastContextArgs.concat(configArgs);

                this.channel.appendLine(`Running phpunit with driver: ${driver.name}`);
                const process = await driver.run(this.channel, runArgs);
    
                process.stderr.on('data', (buffer: Buffer) => {
                    this.channel.append(buffer.toString());
                });
                process.stdout.on('data', (buffer: Buffer) => {
                    this.channel.append(buffer.toString());
                });
    
                this.channel.show();
            }
        }
        else
        {
            console.error(`Wasn't able to start phpunit.`);
        }
    }

    private execTest(directory: string, nearest = false)
    {
        let config = vscode.workspace.getConfiguration("phpunit");
        let configArgs = config.get<Array<string>>("args", []);
        let preferRunClassTestOverQuickPickWindow = config.get<Boolean>("preferRunClassTestOverQuickPickWindow", false);

        let args = [].concat(configArgs);

        const editor = vscode.window.activeTextEditor;
        let range = editor ? editor.document.getWordRangeAtPosition(editor.selection.active) : null;

        if (directory != null && directory != "")
        {
            args.push(directory);

            // Run directory test.
            this.resolvePhpUnit(args, false);
            return;
        }
        else if (!editor)
        {
            // Run test according to --configuration flag.
            this.resolvePhpUnit(args, false);
            return;
        }
        else if (range)
        {
            let line = editor.document.lineAt(range.start.line);
            var wordOnCursor = editor.document.getText(range);
            var isFunction = line.text.indexOf("function") != -1
            var isClass = line.text.indexOf("class") != -1;

            if (isFunction && wordOnCursor != null)
            {
                args.push("--filter");
                args.push(wordOnCursor);

                // Run test on function instantly.
                this.resolvePhpUnit(args);
                return;
            }
            else if (isClass)
            {
                // Run test on class instantly.
                this.resolvePhpUnit(args);
                return;
            }
        }

        if (!nearest && preferRunClassTestOverQuickPickWindow)
        {
            // Run test on class instantly.
            this.resolvePhpUnit(args);
            return;
        }

        var promise;

        if (!nearest)
        {
            promise = this.getUserSelectedTest(editor);
        }
        else
        {
            promise = this.getNearestTest(editor);
        }

        if (promise)
        {
            promise.then((selectedTest) => {
                if (selectedTest)
                {
                    if (selectedTest.indexOf('function - ') != -1)
                    {
                        args.push("--filter");
                        args.push(selectedTest.replace('function - ', ''));
                    }

                    // Run test selected in quick pick window.
                    this.resolvePhpUnit(args);
                }
            });
        }
    }

    private getNearestTest(editor): Thenable<any> | null
    {
        if (editor.document.fileName != null)
        {
            return new Promise((resolve, reject) => {
                let currentTest = this.getObjectOrMethod(editor, 'method');

                if (currentTest) {
                    resolve(`function - ${currentTest}`);
                } else {
                    reject();
                }
            });
        }
    }

    private getUserSelectedTest(editor: vscode.TextEditor): Thenable<any> | null
    {
        if (editor.document.fileName != null)
        {
            let testFunctions = [];

            {
                let currentTest = this.getObjectOrMethod(editor, 'method');
                if (currentTest)
                {
                    testFunctions.push('function - ' + currentTest);
                }
            }

            testFunctions.push('class - ' + this.getObjectOrMethod(editor, 'class'));

            let windowText = editor.document.getText();
            let startPosition = editor.selection.active.line;
            let result = null;

            while ((result = this.regex.method.exec(windowText)))
            {
                let testToAdd = result[1].toString().trim();

                if (!testFunctions.length || testFunctions[0] != testToAdd)
                {
                    testFunctions.push('function - ' + testToAdd);
                }
            }

            return vscode.window.showQuickPick(testFunctions, {});
        }

        return null;
    }

    private resolvePhpUnit(args: string[], putFsPathIntoArgs: boolean = true)
    {
        let config = vscode.workspace.getConfiguration("phpunit");
        let execPath = config.get<string>("execPath", "phpunit");

        if (execPath == "") {
            this.execThroughComposer(execPath, args, putFsPathIntoArgs);
        }
        else
        {
            this.execPhpUnit(execPath, args, putFsPathIntoArgs);
        }
    }

    private execThroughComposer(execPath: string, args: string[], putFsPathIntoArgs: boolean, currentPath = '')
    {
        let rootPath = vscode.workspace.rootPath;

        if (currentPath == '')
        {
            let filePath = vscode.window.activeTextEditor.document.uri.fsPath;
            currentPath = filePath.replace(/([\\\/][^\\\/]*\.[^\\\/]+)$/, '');
        }
        else
        {
            currentPath = currentPath.replace(/[\\\/][^\\\/]*$/, '');
        }

        let phpUnitComposerBinFile = `${currentPath}/vendor/bin/phpunit`;

        if (fs.existsSync(phpUnitComposerBinFile))
        {
            this.execPhpUnit(phpUnitComposerBinFile, args, putFsPathIntoArgs);
        }
        else if (currentPath != rootPath)
        {
            this.execThroughComposer(execPath, args, putFsPathIntoArgs, currentPath);
        }
        else
        {
            vscode.window.showErrorMessage('Couldn\'t find a vendor/bin/phpunit file');
        }
    }

    private execPhpUnit(execPath: string, args: string[], putFsPathIntoArgs: boolean = true)
    {
        this.channel.clear();
        this.lastCommand = {
            execPath: execPath,
            args: args.slice(),
            putFsPathIntoArgs: putFsPathIntoArgs
        };

        if (putFsPathIntoArgs)
        {
            args.push(vscode.window.activeTextEditor.document.uri.fsPath);
        }

        let phpunitProcess = cp.spawn(execPath, args, { cwd: vscode.workspace.rootPath });
        this.channel.appendLine(execPath + ' ' + args.join(' '));

        phpunitProcess.stderr.on("data", (buffer: Buffer) => {
            this.channel.append(buffer.toString());
        });
        phpunitProcess.stdout.on("data", (buffer: Buffer) => {
            this.channel.append(buffer.toString());
        });

        this.channel.show();
    }

    private getObjectOrMethod(editor, type: string): string|undefined
    {
        if (!this.regex.hasOwnProperty(type))
        {
            throw new Error('Invalid type property passed: ' + type);
        }

        let regexToUse = this.regex[type];
        let result = undefined;
        let position = 0;
        let modifier = 1;

        if (type === 'method')
        {
            position = editor.selection.active.line;
            modifier = -1;
        }

        while (result === undefined && position > -1)
        {
            let line = editor.document.lineAt(position);
            let regexResult = null;

            if ((regexResult = regexToUse.exec(line.text)))
            {
                result = regexResult[1].toString().trim();
            }

            position += modifier;
        }

        return result;
    }
}

class Command {
    public execPath: string;
    public args: Array<string>;
    public putFsPathIntoArgs: boolean;
}
