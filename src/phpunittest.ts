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
        if (editor != undefined) {
            let currentDir = editor.document.uri.path.split('/').filter((item) => { return !item.endsWith('.php') }).join('/');
            this.execTest(`${currentDir}/`);
        } else {
            console.error("Couldn't determine directory. Make sure you have a file open in the directory you want to test.");
        }
    }

    private execTest(directory: string) {
        let config = vscode.workspace.getConfiguration("phpunit");
        let execPath = config.get<string>("execPath", "phpunit");
        let configArgs = config.get<Array<string>>("args", []);

        let args = [].concat(configArgs);
        if (directory != null && directory != "")
        {
            args.push(directory);
            this.execPhpUnit(execPath, args, false);

            return;
        }
        else if (vscode.window.activeTextEditor == null)
        {
            this.execPhpUnit(execPath, args, false);
        }
        else
        {
            const editor = vscode.window.activeTextEditor;
            let range = editor.document.getWordRangeAtPosition(editor.selection.active);
            if (range != undefined) {
                let line = editor.document.lineAt(range.start.line);
                var wordOnCursor = editor.document.getText(range);
                var isFunction = line.text.indexOf("function") != -1 && this.regex.method.test(line.text);
                var isClass = line.text.indexOf("class") != -1;

                if (isFunction && wordOnCursor != null) {
                    args.push("--filter");
                    args.push(wordOnCursor);
        
                    this.execPhpUnit(execPath, args);

                    return;
                }
                else if (isClass)
                {
                    this.execPhpUnit(execPath, args);

                    return;
                }
            }
            
            if (editor.document.fileName != null)
            {
                let testFunctions = [];
                let currentTest = null;

                if ((currentTest = this.getObjectOrMethod('method')))
                {
                    testFunctions.push(currentTest);
                }    

                let testClassName = this.getObjectOrMethod('class');
                testFunctions.push(testClassName);

                let windowText = editor.document.getText();
                let regexToUse = this.regex.method;
                let result = null;
                let startPosition = editor.selection.active.line;

                while ((result = regexToUse.exec(windowText))) {
                    let testToAdd = result[1].toString().trim();

                    if (!testFunctions.length || testFunctions[0] != testToAdd) {
                        testFunctions.push(testToAdd);
                    }    
                }

                if (testFunctions.length > 0) {
                    vscode.window.showQuickPick(testFunctions, {}).then((selectedTest) => {
                        if (undefined !== selectedTest) {
                            // Assume methods are prefixed with 'test' while classes are not
                            if (selectedTest.indexOf('test') === 0)
                            {
                                args.push("--filter");
                                args.push(selectedTest);
                            }

                            this.execPhpUnit(execPath, args);
                        }
                    });
                }
            }
        }
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

    private getObjectOrMethod(type: string): string|undefined
    {
        if (!this.regex.hasOwnProperty(type))
        {
            throw new Error('Invalid type property passed: ' + type);
        }
    
        const editor = vscode.window.activeTextEditor;
        const text = editor.document.getText();
    
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
