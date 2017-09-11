# [v2.0.1](https://github.com/elonmallin/vscode-phpunit/releases/tag/v2.0.1)
- **Bugfix:** make sure the output channel is shown after test is run.

# [v2.0.0](https://github.com/elonmallin/vscode-phpunit/releases/tag/v2.0.0)
- This release shows the quick pick window to select a test when you run "PHPUnit Test" not directly on a function or class. If you have the cursor directly on the class or function name it will run instantly just like in previous releases.

  ![vscode-phpunit-quick-pick](images/vscode-phpunit-quick-pick.gif)

- Multiple projects can be used with the "PHPUnit Test Directory" command since full paths will now be used to locate the directory.