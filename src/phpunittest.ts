'use strict';

import * as vscode from 'vscode';
import cp = require('child_process');

export class TestRunner {
    private outputChannel;

    private readonly regex = {
        method: /\s*public*\s+function\s+(test\w*)\s*\(/gi,
        class: /class\s+(\w*)\s*{?/gi
    };

    constructor(channel) {
        this.outputChannel = channel;
    }

    public runTest() {
        this.execTest(null);
    }

    public runTestDirectory() {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            let currentDir = vscode.workspace.asRelativePath(editor.document.uri).replace(/\/\w*\.php$/i, '');
            this.execTest(`./${currentDir}`);
        } else {
            console.error("Couldn't determine directory. Make sure you have a file open in the directory you want to test.");
        }
    }

    private execTest(directory: string)
    {
        let config = vscode.workspace.getConfiguration("phpunit");
        let execPath = config.get<string>("execPath", "phpunit");
        let configArgs = config.get<Array<string>>("args", []);

        let args = [].concat(configArgs);

        const editor = vscode.window.activeTextEditor;
        let range = editor ? editor.document.getWordRangeAtPosition(editor.selection.active) : null;
        
        if (directory != null && directory != "")
        {
            args.push(directory);

            // Run directory test.
            this.execPhpUnit(execPath, args, false);
            return;
        }
        else if (!editor)
        {
            // Run test according to --configuration flag.
            this.execPhpUnit(execPath, args, false);
            return;
        }
        else if (range)
        {
            let line = editor.document.lineAt(range.start.line);
            var wordOnCursor = editor.document.getText(range);
            var isFunction = line.text.indexOf("function") != -1 && this.regex.method.test(line.text);
            var isClass = line.text.indexOf("class") != -1;

            if (isFunction && wordOnCursor != null)
            {
                args.push("--filter");
                args.push(wordOnCursor);
    
                // Run test on function instantly.
                this.execPhpUnit(execPath, args);
                return;
            }
            else if (isClass)
            {
                // Run test on class instantly.
                this.execPhpUnit(execPath, args);
                return;
            }
        }
        
        var promise = this.getUserSelectedTest(editor);
        if (promise)
        {
            promise.then((selectedTest) => {
                if (selectedTest)
                {
                    if (selectedTest.indexOf('function - test') != -1)
                    {
                        args.push("--filter");
                        args.push(selectedTest.replace('function - ', ''));
                    }

                    // Run test selected in quick pick window.
                    this.execPhpUnit(execPath, args);
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

    private execPhpUnit(execPath, args, putFsPathIntoArgs = true)
    {
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
