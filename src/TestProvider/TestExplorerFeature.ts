import * as vscode from 'vscode';
import { testData, TestFile } from './PhpunitTestFile';
import { TestCase } from './PhpunitTestCase';

export async function addTestExplorerFeature(context: vscode.ExtensionContext) {
  const testExplorerEnabled = vscode.workspace.getConfiguration('phpunit').get<boolean>('testExplorer.enabled', false);
  if (!testExplorerEnabled) {
    return;
  }

	const ctrl = vscode.tests.createTestController('phpunitTestController', 'Phpunit');
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
		const queue: { test: vscode.TestItem; data: TestFile | TestCase }[] = [];
		const run = ctrl.createTestRun(request);
		// map of file uris to statements on each line:
		// const coveredLines = new Map</* file uri */ string, (vscode.StatementCoverage | undefined)[]>();

		const discoverTests = async (tests: Iterable<vscode.TestItem>) => {
			for (const test of tests) {
				if (request.exclude?.includes(test)) {
					continue;
				}

				const data = testData.get(test);
				if (data instanceof TestCase) {
					run.enqueued(test);
					queue.push({ test, data });
				}
        else if (data instanceof TestFile) {
          run.enqueued(test);
					queue.push({ test, data });
        }

				// 	await discoverTests(gatherTestItems(test.children));
				// }

				// if (test.uri && !coveredLines.has(test.uri.toString())) {
				// 	try {
				// 		const lines = (await getContentFromFilesystem(test.uri)).split('\n');
				// 		coveredLines.set(
				// 			test.uri.toString(),
				// 			lines.map((lineText, lineNo) =>
				// 				lineText.trim().length ? new vscode.StatementCoverage(0, new vscode.Position(lineNo, 0)) : undefined
				// 			)
				// 		);
				// 	} catch {
				// 		// ignored
				// 	}
				// }
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

				// const lineNo = test.range!.start.line;
				// const fileCoverage = coveredLines.get(test.uri!.toString());
				// const lineInfo = fileCoverage?.[lineNo];
				// if (lineInfo) {
				// 	lineInfo.executionCount++;
				// }

				run.appendOutput(`Completed ${test.id}\r\n`);
			}

			run.end();
		};

		// run.coverageProvider = {
		// 	provideFileCoverage() {
		// 		const coverage: vscode.FileCoverage[] = [];
		// 		for (const [uri, statements] of coveredLines) {
		// 			coverage.push(
		// 				vscode.FileCoverage.fromDetails(
		// 					vscode.Uri.parse(uri),
		// 					statements.filter((s): s is vscode.StatementCoverage => !!s)
		// 				)
		// 			);
		// 		}

		// 		return coverage;
		// 	},
		// };

		discoverTests(request.include ?? gatherTestItems(ctrl.items)).then(runTestQueue);
	};

	ctrl.refreshHandler = async () => {
		await Promise.all(getWorkspaceTestPatterns().map(({ pattern, exclude }) => findInitialFiles(ctrl, pattern, exclude)));
	};

	ctrl.createRunProfile('Run Tests', vscode.TestRunProfileKind.Run, runHandler, true, undefined, true);

	ctrl.resolveHandler = async item => {
		if (!item) {
			context.subscriptions.push(...startWatchingWorkspace(ctrl, fileChangedEmitter));
			return;
		}

		const data = testData.get(item);
		if (data instanceof TestFile) {
			await data.updateFromDisk(ctrl, item);
		}
	};

	function updateNodeForDocument(e: vscode.TextDocument) {
		if (e.uri.scheme !== 'file') {
			return;
		}

		if (!e.uri.path.endsWith('Test.php')) {
			return;
		}

		const { file, data } = getOrCreateFile(ctrl, e.uri);
		data.updateFromContents(ctrl, e.getText(), file);
	}

	for (const document of vscode.workspace.textDocuments) {
		updateNodeForDocument(document);
	}

	context.subscriptions.push(
		vscode.workspace.onDidOpenTextDocument(updateNodeForDocument),
		vscode.workspace.onDidChangeTextDocument(e => updateNodeForDocument(e.document)),
	);
}

function getOrCreateFile(controller: vscode.TestController, uri: vscode.Uri) {
	const existing = controller.items.get(uri.toString());
	if (existing) {
		return { file: existing, data: testData.get(existing) as TestFile };
	}

	const file = controller.createTestItem(uri.toString(), uri.path.split('/').pop()!, uri);
	controller.items.add(file);

	const data = new TestFile(uri.toString());
	testData.set(file, data);

	file.canResolveChildren = true;
	return { file, data };
}

function gatherTestItems(collection: vscode.TestItemCollection) {
	const items: vscode.TestItem[] = [];
	collection.forEach(item => items.push(item));
	return items;
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

async function findInitialFiles(controller: vscode.TestController, pattern: vscode.GlobPattern, exclude: vscode.GlobPattern) {
	for (const file of await vscode.workspace.findFiles(pattern, exclude)) {
		getOrCreateFile(controller, file);
	}
}

function startWatchingWorkspace(controller: vscode.TestController, fileChangedEmitter: vscode.EventEmitter<vscode.Uri>) {
	return getWorkspaceTestPatterns().map(({ workspaceFolder, pattern, exclude }) => {
		const watcher = vscode.workspace.createFileSystemWatcher(pattern);

		watcher.onDidCreate(uri => {
			getOrCreateFile(controller, uri);
			fileChangedEmitter.fire(uri);
		});
		watcher.onDidChange(async uri => {
			const { file, data } = getOrCreateFile(controller, uri);
			if (data.didResolve) {
				await data.updateFromDisk(controller, file);
			}
			fileChangedEmitter.fire(uri);
		});
		watcher.onDidDelete(uri => controller.items.delete(uri.toString()));

		findInitialFiles(controller, pattern, exclude);

		return watcher;
	});
}
