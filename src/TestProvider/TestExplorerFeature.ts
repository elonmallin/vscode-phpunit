import * as vscode from 'vscode';
import { ITestCase, TestClass, TestDirectory, TestMethod, createOrUpdateFromPath, gatherTestItems, testData, uriToTestItem } from './TestCases';
import path = require('path');
import { getOrCreate } from './TestCases';

let controller: vscode.TestController;

export async function addTestExplorerFeature(context: vscode.ExtensionContext) {
  const testExplorerEnabled = vscode.workspace.getConfiguration('phpunit').get<boolean>('testExplorer.enabled', false);
  if (!testExplorerEnabled) {
    return;
  }

	const ctrl = vscode.tests.createTestController('phpunitTestController', 'Phpunit');
  controller = ctrl;
	context.subscriptions.push(ctrl);

	const fileChangedEmitter = new vscode.EventEmitter<vscode.Uri>();
	const watchingTests = new Map<vscode.TestItem | 'ALL', vscode.TestRunProfile | undefined>();
	fileChangedEmitter.event(uri => {
		if (watchingTests.has('ALL')) {
			startTestRun(new vscode.TestRunRequest(undefined, undefined, watchingTests.get('ALL'), true));
			return;
		}

		const include: vscode.TestItem[] = [];
		let profile: vscode.TestRunProfile | undefined;
		for (const [item, thisProfile] of watchingTests) {
			const cast = item as vscode.TestItem;
			if (cast.uri?.toString() == uri.toString()) {
				include.push(cast);
				profile = thisProfile;
			}
		}

		if (include.length) {
			startTestRun(new vscode.TestRunRequest(include, undefined, profile, true));
		}
	});

	const runHandler = (request: vscode.TestRunRequest, cancellation: vscode.CancellationToken) => {
		if (!request.continuous) {
			return startTestRun(request);
		}

		if (request.include === undefined) {
			watchingTests.set('ALL', request.profile);
			cancellation.onCancellationRequested(() => watchingTests.delete('ALL'));
		} else {
			request.include.forEach(item => watchingTests.set(item, request.profile));
			cancellation.onCancellationRequested(() => request.include!.forEach(item => watchingTests.delete(item)));
		}
	};

	const startTestRun = (request: vscode.TestRunRequest) => {
		const queue: { test: vscode.TestItem; data: ITestCase }[] = [];
		const run = ctrl.createTestRun(request);

		const discoverTests = async (tests: Iterable<vscode.TestItem>) => {
			for (const test of tests) {
				if (request.exclude?.includes(test)) {
					continue;
				}

				const data = testData.get(test)!;
        // if (!data.isResolved) {
        //   if (data instanceof TestDirectory) {
        //     await findTestsInDirectory(ctrl, test.uri!, test);
        //   }
        // }
        run.enqueued(test);
        queue.push({ test, data });
			}
		};

		const runTestQueue = async () => {
			for (const { test, data } of queue) {
				run.appendOutput(`Running ${test.id}\r\n`);
				if (run.token.isCancellationRequested) {
					run.skipped(test);
				} else {
					run.started(test);
					await data.run(test, run);
				}

				run.appendOutput(`Completed ${test.id}\r\n`);
			}

			run.end();
		};

		discoverTests(request.include ?? gatherTestItems(ctrl.items)).then(runTestQueue);
	};

	ctrl.refreshHandler = async () => {
		await Promise.all(getWorkspaceTestPatterns().map(({ pattern, exclude }) => findInitialTests(ctrl, pattern, exclude)));
	};

	ctrl.createRunProfile('Run Tests', vscode.TestRunProfileKind.Run, runHandler, true, undefined, true);

	ctrl.resolveHandler = async item => {
		if (!item) {
			context.subscriptions.push(...startWatchingWorkspace(ctrl, fileChangedEmitter));
			return;
		}

		// const data = testData.get(item)!;
    // if (item.canResolveChildren) {
    //   await findTestsInDirectory(ctrl, item.uri!, item);
    // }
    // TODO: implement this
    // await data.updateFromDisk(ctrl, item);
	};

	for (const document of vscode.workspace.textDocuments) {
		updateNodeForDocument(document);
	}

	context.subscriptions.push(
		vscode.workspace.onDidOpenTextDocument(updateNodeForDocument),
		vscode.workspace.onDidChangeTextDocument(e => updateNodeForDocument(e.document)),
	);
}

function getWorkspaceTestPatterns() {
	if (!vscode.workspace.workspaceFolders) {
		return [];
	}

	return vscode.workspace.workspaceFolders.map(workspaceFolder => ({
		workspaceFolder,
		pattern: new vscode.RelativePattern(workspaceFolder, '**/tests/**/*Test.php'),
    exclude: new vscode.RelativePattern(workspaceFolder, '**/{.git,node_modules,vendor}/**'),
	}));
}

async function updateNodeForDocument(e: vscode.TextDocument) {
  if (e.uri.scheme !== 'file') {
    return;
  }

  if (!e.uri.path.endsWith('Test.php')) {
    return;
  }

  const wsPattern = getWorkspaceTestPatterns()
    .find(({ workspaceFolder }) => e.uri.fsPath.startsWith(workspaceFolder.uri.fsPath));
  if (!wsPattern) {
    return;
  }

  const { commonDirectory } = await getFilesAndCommonDirectory(wsPattern.pattern, wsPattern.exclude);
  await createOrUpdateFromPath(controller, e.uri.fsPath, commonDirectory);
}

async function findInitialTests(controller: vscode.TestController, pattern: vscode.GlobPattern, exclude: vscode.GlobPattern) {
  const { files, commonDirectory } = await getFilesAndCommonDirectory(pattern, exclude);

  for (const file of files) {
    await createOrUpdateFromPath(controller, file.fsPath, commonDirectory);
  }
  // await getOrCreate(controller, vscode.Uri.parse(`file:///${commonDirectory}`));
}

async function getFilesAndCommonDirectory(pattern: vscode.GlobPattern, exclude: vscode.GlobPattern) {
  const files = await vscode.workspace.findFiles(pattern, exclude);
  const directories = files.map(file => path.dirname(file.fsPath));
  const commonDirectory = directories.reduce((common, dir) => {
      let i = 0;
      while (i < common.length && common[i] === dir[i]) {
          i++;
      }
      return common.substring(0, i);
  }, directories[0]);

  return { files, commonDirectory };
}

function startWatchingWorkspace(controller: vscode.TestController, fileChangedEmitter: vscode.EventEmitter<vscode.Uri>) {
	return getWorkspaceTestPatterns().map(({ workspaceFolder, pattern, exclude }) => {
		const watcher = vscode.workspace.createFileSystemWatcher(pattern);

    watcher.onDidCreate(async uri => {
      const document = await vscode.workspace.openTextDocument(uri);
      updateNodeForDocument(document);
      fileChangedEmitter.fire(uri);
    });
    watcher.onDidChange(async uri => {
    	const { file, data } = findTestsInFile(controller, uri);
    	if (data.didResolve) {
    		await data.updateFromDisk(controller, file);
    	}
    	fileChangedEmitter.fire(uri);
    });
		// watcher.onDidDelete(uri => controller.items.delete(uri.toString()));

		findInitialTests(controller, pattern, exclude);

		return watcher;
	});
}
