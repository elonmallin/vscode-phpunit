'use strict';

import * as vscode from 'vscode';
import cp = require('child_process');
const fs = require('fs');

export class TestRunner {
    private outputChannel: vscode.OutputChannel;

    private lastCommand: Command;

    private readonly regex = {
        method: /\s*public*\s+function\s+(\w*)\s*\(/gi,
        class: /class\s+(\w*)\s*{?/gi
    };

    constructor(channel) {
        this.outputChannel = channel;
    }

    public runTest() {
        this.execTest(null);
    }

    public runNearestTest() {
        this.execTest(null, true);
    }

    public runTestDirectory() {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            let currentDir = editor.document.uri.fsPath.replace(/(\/|\\)\w*\.php$/i, '');
            this.execTest(`${currentDir}`);
        } else {
            console.error("Couldn't determine directory. Make sure you have a file open in the directory you want to test.");
        }
    }

    public rerunLastTest()
    {
        if (this.lastCommand == null)
        {
            this.outputChannel.appendLine("No test was run yet.");
            this.outputChannel.show();
        }
        else
        {
            this.execPhpUnit(this.lastCommand.execPath, this.lastCommand.args, this.lastCommand.putFsPathIntoArgs);
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

    private getUserSelectedTest(editor): Thenable<any> | null
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
            let filePath = vscode.window.activeTextEditor.document.uri.path;
            currentPath = filePath.replace(/(\/[^\/]*\.[^\/]+)$/, '');
        }
        else
        {
            currentPath = currentPath.replace(/(\/[^\/]*)$/, '');
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
        this.outputChannel.clear();
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
        this.outputChannel.appendLine(execPath + ' ' + args.join(' '));

        phpunitProcess.stderr.on("data", (buffer: Buffer) => {
            this.outputChannel.append(buffer.toString());
        });
        phpunitProcess.stdout.on("data", (buffer: Buffer) => {
            this.outputChannel.append(buffer.toString());
        });

        this.outputChannel.show();
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
