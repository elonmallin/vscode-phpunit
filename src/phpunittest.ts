'use strict';

import * as vscode from 'vscode';
import cp = require('child_process');

const regex = {
    method: /\s*public*\s+function\s+(test\w*)\s*\(/gi,
    class: /class\s+(\w*)\s*{?/gi
};

export function runTest() {
    execTest(null);
}

export function runTestDirectory() {
    const editor = vscode.window.activeTextEditor;
    if (editor != undefined) {
        let currentDir = editor.document.uri.path.split('/').filter((item) => { return ! item.endsWith('.php')}).join('/');
        execTest(`${currentDir}/`);
        return;
    }
    console.error("Couldn't determine directory. Make sure you have a file open in the directory you want to test.");
}

function execPhpUnit(execPath, args, outputChannel, putFsPathIntoArgs = true)
{
    if (putFsPathIntoArgs)
    {
        args.push(vscode.window.activeTextEditor.document.uri.fsPath);
    }

    let phpunitProcess = cp.spawn(execPath, args, { cwd: vscode.workspace.rootPath });
    outputChannel.appendLine(execPath + ' ' + args.join(' '));

    phpunitProcess.stderr.on("data", (buffer: Buffer) => {
        outputChannel.append(buffer.toString());
    });
    phpunitProcess.stdout.on("data", (buffer: Buffer) => {
        outputChannel.append(buffer.toString());
    });
}

function _getObjectOrMethod(type: string): string|undefined
{
    if (!regex.hasOwnProperty(type))
    {
        throw new Error('Invalid type property passed: ' + type);
    }

    const editor = vscode.window.activeTextEditor;
    const text = editor.document.getText();

    let regexToUse = regex[type];
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

function execTest(directory: string) {
    let config = vscode.workspace.getConfiguration("phpunit");
    let execPath = config.get<string>("execPath", "phpunit");
    let configArgs = config.get<Array<string>>("args", []);

    const editor = vscode.window.activeTextEditor;
    if (editor != undefined) {
        let range = editor.document.getWordRangeAtPosition(editor.selection.active);
        if (range != undefined) {
            var wordOnCursor = editor.document.getText(range);
            let line = editor.document.lineAt(range.start.line);
            var isFunction = line.text.indexOf("function") != -1 && regex.method.test(line.text);
            var isClass = line.text.indexOf("class") != -1;
        }
    }

    let outputChannel = vscode.window.createOutputChannel("phpunit");
    outputChannel.show();

    let args = [].concat(configArgs);
    if (directory != null && directory != "")
    {
        args.push(directory);

        execPhpUnit(execPath, args, outputChannel, false);
    }
    else
    {
        if (isFunction && wordOnCursor != null) {
            args.push("--filter");
            args.push(wordOnCursor);

            execPhpUnit(execPath, args, outputChannel);
        }
        else if (editor != undefined && editor.document.fileName != null)
        {
            if (isClass)
            {
                execPhpUnit(execPath, args, outputChannel);
            }
            else
            {
                let testFunctions = [];
                let currentTest = null;

                if ((currentTest = _getObjectOrMethod('method')))
                {
                    testFunctions.push(currentTest);
                }    

                let testClassName = _getObjectOrMethod('class');

                let windowText = editor.document.getText();
                let regexToUse = regex.method;
                let result = null;
                let startPosition = editor.selection.active.line;
                
                testFunctions.push(testClassName);

                while ((result = regexToUse.exec(windowText))) {
                    let testToAdd = result[1].toString().trim();

                    if (!testFunctions.length || testFunctions[0] != testToAdd) {
                        testFunctions.push(testToAdd);
                    }    
                }

                if (testFunctions.length > 0) {
                    vscode.window.showQuickPick(testFunctions, {}).then(function (selectedTest) {
                        if (undefined !== selectedTest) {
                            // Assume methods are prefixed with 'test' while classes are not
                            if (selectedTest.indexOf('test') === 0)
                            {
                                args.push("--filter");
                                args.push(selectedTest);
                            }

                            execPhpUnit(execPath, args, outputChannel);
                        }    
                    });
                } else {
                    execPhpUnit(execPath, args, outputChannel, false);
                }    
            }    
        } 
    }
}