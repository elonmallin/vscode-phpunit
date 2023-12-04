# [4.4.0](https://github.com/elonmallin/vscode-phpunit/releases/tag/4.4.0)

- **Bugfix:** Wrap test suites with single quotes

# [v4.1.1](https://github.com/elonmallin/vscode-phpunit/releases/tag/v4.1.1)

- **Bugfix:** Don't stack up --color in the output command for each run.

# [v4.1.0](https://github.com/elonmallin/vscode-phpunit/releases/tag/v4.1.0)

- Handle `xml` files in `Run: Test` to enable running `<testsuites>` from `**phpunit.xml**` files.
- Add `Run: Test Suite` to quick pick from all `**phpunit.xml**` files and then quick pick from all `<testsuites>`.
- Add `phpunit.colors` setting to get colors by default `--colors=always`. Set to `null` or empty string to disable.
- Add `ssh` driver.
- Mark `ssh` and `docker` as `DEPRECATED` since it's really better to use the `Remote Development` extension from Microsoft.
- **Bugfix:** Make `Run: Test Nearest` work with classes as well as functions.
- **Bugfix:** Extract filename for test with `path.basename` instead of regex to cover more cases.

# [v4.0.1](https://github.com/elonmallin/vscode-phpunit/releases/tag/v4.0.1)

- **Bugfix:** Handle space in path for the filter arg of phpunit.
- **Bugfix:** Use the `phpunit.php` config if the path is found.

# [v4.0.0](https://github.com/elonmallin/vscode-phpunit/releases/tag/v4.0.0)

- **BREAKING CHANGE** Updated vscode engine version required to latest 1.27.0.
- Add color output and show failed tests in problems pane by running a task using a problem matcher.
- Add config property `phpunit.docker.image` for choosing docker image for `DockerDriver`.
- Add `DockerContainerDriver` to find running containers and pick from list.
- Add `phpunit.docker.container` to set running container to use for `DockerContainerDriver`.
- Add `phpunit.command` config for running custom commands in place of php. Such as custom docker commands.
- Add `phpunit.paths` to map paths for virtual environments. String replace with regex will be used for all paths in this config. Ex config:

```json
{
  "/local/path": "/vitual/path",
  "/second/local/path": "/second/virtual/path"
}
```

# [v3.1.0](https://github.com/elonmallin/vscode-phpunit/releases/tag/v3.1.0)

- Can now run php through docker. Will look for phpunit in all normal places (path, composer, phar).
- Add Stop running phpunit command (kill process).
- **Bugfix:** Prevent output window from stealing focus.
- Update vscode, typescript and other packages.

# [v3.0.0](https://github.com/elonmallin/vscode-phpunit/releases/tag/v3.0.0)

- Now uses global php if not set at `phpunit.php` (previously `phpunit.execPath`)
  - `phpunit.execPath` still works for backwardscompatibility but is deprecated.
- Now tries to find phpunit in the project folder (composers vendor dir and .phar files).
- Will clear the output after each run (option: `clearOutputOnRun` default=true).

# [v2.2.1](https://github.com/elonmallin/vscode-phpunit/releases/tag/v2.2.1)

- Add command `phpunit.RerunLastCommand`. Will run the last command again and can be bound to hotkey.

# [v2.1.1](https://github.com/elonmallin/vscode-phpunit/releases/tag/v2.1.1)

- **Bugfix:** Function tests again allows `@test` docblocks and not just `test*` prefix.

# [v2.1.0](https://github.com/elonmallin/vscode-phpunit/releases/tag/v2.1.0)

- **Bugfix:** Run the instant tests reliably if the cursor is in the right place. Not every other try.
- Add config option preferRunClassTestOverQuickPickWindow (default: false). Set to true to never show the quick pick window and just test the whole class if the cursor is on anything other than a function name.

# [v2.0.1](https://github.com/elonmallin/vscode-phpunit/releases/tag/v2.0.1)

- **Bugfix:** Make sure the output channel is shown on test run.

# [v2.0.0](https://github.com/elonmallin/vscode-phpunit/releases/tag/v2.0.0)

- This release shows the quick pick window to select a test when you run "PHPUnit Test" not directly on a function or class. If you have the cursor directly on the class or function name it will run instantly just like in previous releases.

  ![vscode-phpunit-quick-pick](images/vscode-phpunit-quick-pick.gif)

- Multiple projects can be used with the "PHPUnit Test Directory" command since full paths will now be used to locate the directory.
