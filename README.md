![Latest Release](https://vsmarketplacebadge.apphb.com/version/emallin.phpunit.svg) ![Installs](https://vsmarketplacebadge.apphb.com/installs-short/emallin.phpunit.svg) ![Rating](https://vsmarketplacebadge.apphb.com/rating-short/emallin.phpunit.svg)
# Phpunit for VSCode
## Setup
* Install [phpunit](https://phpunit.de/).
* Set the config values:
```JSON
{
    "phpunit.execPath": "path/to/phpunit",
    "phpunit.args": [
        "--configuration", "./phpunit.xml.dist"
    ]
}
```

## How to use
Run with (`Cmd+Shift+P` on OSX or `Ctrl+Shift+P` on Windows and Linux) and execute the `PHPUnit Test` command.
* **Test a function**: Place cursor on a function and run.

![vscode-phpunit-test-function](images/vscode-phpunit-test-function.gif)

* **Test a class**: Place cursor anywhere in class (except on a function) and run.

![vscode-phpunit-test-class](images/vscode-phpunit-test-class.gif)

* **Test everything according to --configuration**: Close editor window and run.

![vscode-phpunit-test-all](images/vscode-phpunit-test-all.gif)

* **Test everything in a directory**: Open a file in the directory to test and run the `PHPUnit Test Directory` command.

![vscode-phpunit-test-directory](images/vscode-phpunit-test-directory.gif)

* **Run entire class**: Place cursor on line declaring `class` and run.

* **Run specific test**: Place cursor anywhere not on a line declaring `class` or `test` and run.  A dialog will display all possible tests within that class (excluding ones from inherited classes).  This will also look for the current test that you are in (if any) and place that first on the list.

## Notes / Tips / Advanced
* **execPath** is recommended to set in your 'user settings'. Having phpunit in PATH doesn't work (at least on windows 10) =(.
* **args** is recommended to set in your 'workspace settings'. You can add any phpunit args, check phpunit --help.
* To hook into the debugger ([github.com/felixfbecker/vscode-php-debug](https://github.com/felixfbecker/vscode-php-debug)). Add Key:`XDEBUG_CONFIG`, Value:`idekey=VSCODE` to your environment variables. (Tested on Windows 10)