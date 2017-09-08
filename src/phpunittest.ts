'use strict';

import * as vscode from 'vscode';
import cp = require('child_process');

export class TestRunner {
    private outputChannel;

    constructor(channel) {
        this.outputChannel = channel;
    }

    public runTest() {
        this.execTest(null);
    }

    public runTestDirectory() {
        const editor = vscode.window.activeTextEditor;
        if (editor != undefined) {
            let currentDir = editor.document.uri.path.split('/').filter((item) => { return ! item.endsWith('.php')}).join('/');
            this.execTest(`${currentDir}/`);
            return;
        }
        console.error("Couldn't determine directory. Make sure you have a file open in the directory you want to test.");
    }

    private execTest(directory: string) {
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

        this.outputChannel.show();

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
                let relPath = editor.document.uri.fsPath;
                args.push(relPath);
            }
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
}

