'use strict';

import * as vscode from 'vscode';
import cp = require('child_process');

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

    private execTest(directory: string)
    {
        let config = vscode.workspace.getConfiguration("phpunit");
        let execPath = config.get<string>("execPath", "phpunit");
        let configArgs = config.get<Array<string>>("args", []);
        let preferRunClassTestOverQuickPickWindow = config.get<Boolean>("preferRunClassTestOverQuickPickWindow", false);

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
        else if ('xml' === editor.document.languageId && editor.document.uri.path.match(/phpunit\.xml(\.dist)?$/)) 
        {
            args = this.addArgument( args, '--configuration', editor.document.uri.fsPath );
            let testSuites = editor.document.getText().match( /<testsuite[^>]+name="[^"]+">/g );
            if ( testSuites ) {
                testSuites = testSuites.map((v) => v.match(/name="([^"]+)"/)[1]);
                if ( 1 < testSuites.length ) {
                    let promise = vscode.window.showQuickPick( testSuites, {
                        placeHolder: 'Choose one of the defined testsuites',
                    } );
                    if ( promise ) {
                        promise.then((selectedSuite) => {
                            args = this.addArgument( args, '--testsuite', selectedSuite );
                            this.outputChannel.appendLine( 'Running phpunit with currently open configuration and testsuite "' + selectedSuite + '"' );
                            // Run test with new --configuration flag and the selected testsuite.
                            this.execPhpUnit(execPath, args, false);
                        });
                        return;
                    }
                }
                this.outputChannel.appendLine( 'Running phpunit with currently open configuration and testsuite "' + testSuites[0] + '"' );
                // Run test with new --configuration flag and found testsuite.
                this.execPhpUnit(execPath, args, false);
                return;
            }
            this.outputChannel.appendLine( 'Running phpunit with currently open configuration' );
            // Run test with new --configuration flag.
            this.execPhpUnit(execPath, args, false);
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
        
        if (preferRunClassTestOverQuickPickWindow)
        {
            // Run test on class instantly.
            this.execPhpUnit(execPath, args);
            return;
        }
        
        var promise = this.getUserSelectedTest(editor);
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
                    this.execPhpUnit(execPath, args);
                }
            });
        }
    }
    
    private addArgument( args: string[], newArg: string, subsequentArgs ): string[]
    {
        let argPosition = args.indexOf( newArg );
        subsequentArgs = subsequentArgs || [];
        if ( !Array.isArray(subsequentArgs) ) {
            subsequentArgs = [subsequentArgs];
        }
        if (-1 !== argPosition) {
            Array.prototype.splice.apply(args,[
                argPosition,
                1 + subsequentArgs.length,
                newArg
            ].concat( subsequentArgs ));
        } else {
            args.push( newArg );
            args.concat( subsequentArgs );
        }
        return args;
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

    private execPhpUnit(execPath: string, args: string[], putFsPathIntoArgs: boolean = true)
    {
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
