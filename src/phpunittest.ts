'use strict';

import * as vscode from 'vscode';
import cp = require('child_process');

export function runTest() {
    execTest(null);
}

export function runTestDirectory() {
    const editor = vscode.window.activeTextEditor;
    if (editor != undefined) {
        let index = editor.document.fileName.lastIndexOf("\\");
        if (index != -1) {
            let path = editor.document.fileName.substring(0, index);
            let relPath = vscode.workspace.asRelativePath(path);
            execTest("." + relPath);
            return;
        }
    }
    
    console.error("Couldn't determine directory. Make sure you have a file open in the directory you want to test.");
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
            var isFunction = line.text.indexOf("function") != -1;
        }
    }
    
    let outputChannel = vscode.window.createOutputChannel("phpunit");
    outputChannel.show();
    
    let args = [].concat(configArgs);
    if (directory != null && directory != "")
    {
        args.push(directory);
    }
    else
    {
        if (isFunction && wordOnCursor != null)
        {
            args.push("--filter");
            args.push(wordOnCursor);
        }
        if (editor != undefined && editor.document.fileName != null)
        {
            let relPath = vscode.workspace.asRelativePath(editor.document.fileName);
            args.push("." + relPath);
        }
    }
    
    let phpunitProcess = cp.spawn(execPath, args, { cwd: vscode.workspace.rootPath });
    outputChannel.appendLine(execPath + ' ' + args.join(' '));
    
    phpunitProcess.stderr.on("data", (buffer: Buffer) => {
        outputChannel.append(buffer.toString());
    });
    phpunitProcess.stdout.on("data", (buffer: Buffer) => {
        outputChannel.append(buffer.toString());
    });
    /*phpunitProcess.on("close", (code: string) => {
        outputChannel.hide();
    });*/
}