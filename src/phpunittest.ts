'use strict';

import * as vscode from 'vscode';
import cp = require('child_process');

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

function execPhpUnit(execPath, args, outputChannel)
{
    let phpunitProcess = cp.spawn(execPath, args, { cwd: vscode.workspace.rootPath });
    outputChannel.appendLine(execPath + ' ' + args.join(' '));

    phpunitProcess.stderr.on("data", (buffer: Buffer) => {
        outputChannel.append(buffer.toString());
    });
    phpunitProcess.stdout.on("data", (buffer: Buffer) => {
        outputChannel.append(buffer.toString());
    });
}

function execTest(directory: string) {
    let config = vscode.workspace.getConfiguration("phpunit");
    let execPath = config.get<string>("execPath", "phpunit");
    let configArgs = config.get<Array<string>>("args", []);
    let forceClassRunWhenWithinTest = config.get<boolean>("forceClassTest", true);

    const editor = vscode.window.activeTextEditor;
    if (editor != undefined) {
        let range = editor.document.getWordRangeAtPosition(editor.selection.active);
        if (range != undefined) {
            var wordOnCursor = editor.document.getText(range);
            let line = editor.document.lineAt(range.start.line);
            var isFunction = line.text.indexOf("function") != -1;
            var isClass = line.text.indexOf("class") != -1;
        }
    }

    let outputChannel = vscode.window.createOutputChannel("phpunit");
    outputChannel.show();

    let args = [].concat(configArgs);
    if (directory != null && directory != "")
    {
        args.push(directory);

        execPhpUnit(execPath, args, outputChannel);
    }
    else
    {
        if (isFunction && wordOnCursor != null) {
            args.push("--filter");
            args.push(wordOnCursor);

            let relPath = editor.document.uri.fsPath;
            args.push(relPath);

            execPhpUnit(execPath, args, outputChannel);
        }
        else if (editor != undefined && editor.document.fileName != null)
        {
            if (isClass || forceClassRunWhenWithinTest)
            {
                let relPath = editor.document.uri.fsPath;
                args.push(relPath);

                execPhpUnit(execPath, args, outputChannel);
            }
            else
            {
                let windowText = editor.document.getText();
                let testFunctions = [];
                let regex = /\s*(abstract|final|private|protected|public|static)\s+function\s+(test.*)\s*\(/gi;
                let result = null;
                let currentTest = null;
                let startPosition = editor.selection.active.line;
                
                while (!testFunctions.length && startPosition > -1) {
                    let line = editor.document.lineAt(startPosition);

                    if ((result = regex.exec(line.text))) {
                        testFunctions.push(result[2].toString().trim());
                    }

                    startPosition--;
                }

                while ((result = regex.exec(windowText))) {
                    let testToAdd = result[2].toString().trim();

                    if (!testFunctions.length || testFunctions[0] != testToAdd) {
                        testFunctions.push(testToAdd);
                    }    
                }

                if (testFunctions.length > 0) {
                    vscode.window.showQuickPick(testFunctions, {}).then(function (selectedTest) {
                        if (undefined !== selectedTest) {
                            args.push("--filter");
                            args.push(selectedTest);

                            let relPath = editor.document.uri.fsPath;
                            args.push(relPath);

                            execPhpUnit(execPath, args, outputChannel);
                        }    
                    });
                } else {
                    execPhpUnit(execPath, args, outputChannel);
                }    
            }    
        } 
    }
}