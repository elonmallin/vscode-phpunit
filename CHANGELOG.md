# [v2.1.0](https://github.com/elonmallin/vscode-phpunit/releases/tag/v2.1.0)
- **Bugfix:** Run the instant tests reliably if the cursor is in the right place. Not every other try.
- Add config option preferRunClassTestOverQuickPickWindow (default: false). Set to true to never show the quick pick window and just test the whole class if the cursor is on anything other than a function name.

# [v2.0.1](https://github.com/elonmallin/vscode-phpunit/releases/tag/v2.0.1)
- **Bugfix:** Make sure the output channel is shown on test run.

# [v2.0.0](https://github.com/elonmallin/vscode-phpunit/releases/tag/v2.0.0)
- This release shows the quick pick window to select a test when you run "PHPUnit Test" not directly on a function or class. If you have the cursor directly on the class or function name it will run instantly just like in previous releases.

  ![vscode-phpunit-quick-pick](images/vscode-phpunit-quick-pick.gif)

- Multiple projects can be used with the "PHPUnit Test Directory" command since full paths will now be used to locate the directory.