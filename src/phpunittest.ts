'use strict';

import * as vscode from 'vscode';
import cp = require('child_process');

export function runTest() {
    let config = vscode.workspace.getConfiguration("phpunit");
    const editor = vscode.window.activeTextEditor;
    
    let range = editor.document.getWordRangeAtPosition(editor.selection.active);
    if (range != undefined) {
        var wordOnCursor = editor.document.getText(range);
        var line = editor.document.lineAt(range.start.line);
        var isFunction = line.text.indexOf("function") != -1;
    }
    
    let outputChannel = vscode.window.createOutputChannel("phpunittest");
    outputChannel.show();
    
    let args = [];
    if (config.args.length > 0)
    {
        args.concat(config.args);
    }
    if (args.indexOf("--bootstrap") == -1)
    {
        // TODO: Search bootstrap file.
        args.push("--bootstrap");
        args.push("./app/bootstrap.php.cache");
    }
    if (args.indexOf("-c") == -1 && args.indexOf("--configuration") == -1)
    {
        // TODO: Search for phpunit.xml.dist
        args.push("-c");
        args.push("./app/phpunit.xml.dist");
    }
    if (isFunction && wordOnCursor != null)
    {
        args.push("--filter");
        args.push(wordOnCursor);
    }
    if (editor.document.fileName != null)
    {
        args.push(editor.document.fileName);
    }
    
    let phpunitProcess = cp.spawn(config.execPath, args, { cwd: vscode.workspace.rootPath });
    
    phpunitProcess.stderr.on("data", (buffer: Buffer) => {
        outputChannel.append(buffer.toString());
    });
    phpunitProcess.stdout.on("data", (buffer: Buffer) => {
        outputChannel.append(buffer.toString());
    });
    phpunitProcess.on("close", (code: string) => {
        outputChannel.hide();
    });
}

function GetBootstrap() {
    let bootstrap = vscode.workspace.getConfiguration("config.bootstrap");
    if (bootstrap != undefined) {
        return bootstrap;
    } else {
        vscode.workspace.findFiles
        let files = vscode.workspace.findFiles("*composer.json", null);
    }
}