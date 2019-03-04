![Latest Release](https://vsmarketplacebadge.apphb.com/version/emallin.phpunit.svg) ![Installs](https://vsmarketplacebadge.apphb.com/installs-short/emallin.phpunit.svg) ![Rating](https://vsmarketplacebadge.apphb.com/rating-short/emallin.phpunit.svg)
# Phpunit for VSCode
## Setup
* Install [phpunit](https://phpunit.de/).
* Config:
```JSON
{
    "phpunit.php": "absolute/path/to/php",
    "phpunit.phpunit": "path/to/phpunit",
    "phpunit.args": [
        "--configuration", "./phpunit.xml.dist"
    ],
    "phpunit.paths": { // Optional, for virtual environments.
        "/local/path/to/map/to/virtual/path": "/virtual/path",
        "/second/local/path": "/second/virtual/path"
    }
}
```
> **No config** needed if you have **php** or **docker** in you environment variables and **phpunit** in your project (composers vendor dir or .phar file).
See the configuration section in [package.json](package.json) for all values and their descriptions.

### Advanced config
#### Docker container
```JSON
{
    "phpunit.docker.container": "name_of_running_container", // If not set, a selection of running containers will be shown in "pick window".
    "phpunit.paths": {
        "/local/path/to/project": "/path/to/project/in/container"
    }
}
```

#### Run any docker image manually
```JSON
{
    "phpunit.command": "docker run --rm -t -v ${pwd}:/app -w /app php:latest php",
    "phpunit.phpunit": "vendor/bin/phpunit", // Optional, will look for phpunit in common places (vendor dir and .phar in project dir).
    "phpunit.paths": {
        "${workspaceFolder}": "/app"
    }
}
```
#### Run service from docker-compose manually
```JSON
{
    "phpunit.command": "docker-compose run --rm service_name",
    "phpunit.phpunit": "vendor/bin/phpunit", // Optional, will look for phpunit in common places (vendor dir and .phar in project dir).
    "phpunit.paths": {
        "${workspaceFolder}": "/container/project/folder"
    }
}
```

## How to use
Run with (`Cmd+Shift+P` on OSX or `Ctrl+Shift+P` on Windows and Linux) and execute the `PHPUnit Test` command.
* **Test a function**: Place cursor on a function and run.

![vscode-phpunit-test-function](images/vscode-phpunit-test-function.gif)

* **Test a class**: Place cursor on class name and run.

![vscode-phpunit-test-class](images/vscode-phpunit-test-class.gif)

* **Pick test from a list**: Place cursor anywhere in class except on class name or on a function and run.

![vscode-phpunit-quick-pick](images/vscode-phpunit-quick-pick.gif)

* **Test everything according to --configuration**: Close editor window and run.

![vscode-phpunit-test-all](images/vscode-phpunit-test-all.gif)

* **Test everything in a directory**: Open a file in the directory to test and run the `PHPUnit Test Directory` command.

![vscode-phpunit-test-directory](images/vscode-phpunit-test-directory.gif)

* **Rerun last Test**: Run the `PHPUnit Rerun last test` command. It's also possible to set a keybinding to run commands:
```
{ "key": "cmd+shift+r", "command": "phpunit.RerunLastTest", "when": "editorFocus" }
```
## Notes
* **args** is recommended to set in your 'workspace settings'. You can add any phpunit args, check phpunit --help.
* To hook into the debugger ([github.com/felixfbecker/vscode-php-debug](https://github.com/felixfbecker/vscode-php-debug)). Add Key:`XDEBUG_CONFIG`, Value:`idekey=VSCODE` to your environment variables. (Tested on Windows 10)