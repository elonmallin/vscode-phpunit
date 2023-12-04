import {
  CancellationToken,
  EventEmitter,
  ExtensionContext,
  GlobPattern,
  RelativePattern,
  TestController,
  TestItem,
  TestRunProfile,
  TestRunProfileKind,
  TestRunRequest,
  TextDocument,
  Uri,
  tests,
  workspace,
} from "vscode";
import {
  ITestCase,
  createOrUpdateFromPath,
  deleteFromUri,
  gatherTestItems,
  testData,
} from "./TestCases";
import path = require("path");

class TestExplorerFeature {
  private watchingTests = new Map<
    TestItem | "ALL",
    TestRunProfile | undefined
  >();
  private subscriptions: { dispose(): any }[] = [];

  constructor(private ctrl: TestController) {
    this.subscriptions.push(this.ctrl);

    this.ctrl.refreshHandler = async () => {
      await Promise.all(
        getWorkspaceTestPatterns().map(({ pattern, exclude }) =>
          findInitialTests(ctrl, pattern, exclude),
        ),
      );
    };

    this.ctrl.createRunProfile(
      "Run Tests",
      TestRunProfileKind.Run,
      this.runHandler,
      true,
      undefined,
      true,
    );

    const fileChangedEmitter = this.createFileChangeEmitter();
    this.ctrl.resolveHandler = async (item) => {
      if (!item) {
        this.subscriptions.push(
          ...startWatchingWorkspace(ctrl, fileChangedEmitter),
        );
      }
    };

    for (const document of workspace.textDocuments) {
      updateNodeForDocument(this.ctrl, document);
    }

    this.subscriptions.push(
      workspace.onDidOpenTextDocument((d) =>
        updateNodeForDocument(this.ctrl, d),
      ),
      workspace.onDidChangeTextDocument(async (e) => {
        deleteFromUri(this.ctrl, this.ctrl.items, e.document.uri);
        await updateNodeForDocument(this.ctrl, e.document);
      }),
    );
  }

  createFileChangeEmitter() {
    const fileChangedEmitter = new EventEmitter<Uri>();

    fileChangedEmitter.event((uri) => {
      if (this.watchingTests.has("ALL")) {
        this.startTestRun(
          new TestRunRequest(
            undefined,
            undefined,
            this.watchingTests.get("ALL"),
            true,
          ),
        );
        return;
      }

      const include: TestItem[] = [];
      let profile: TestRunProfile | undefined;
      for (const [item, thisProfile] of this.watchingTests) {
        const cast = item as TestItem;
        if (cast.uri?.toString() == uri.toString()) {
          include.push(cast);
          profile = thisProfile;
        }
      }

      if (include.length) {
        this.startTestRun(
          new TestRunRequest(include, undefined, profile, true),
        );
      }
    });

    return fileChangedEmitter;
  }

  startTestRun = (request: TestRunRequest) => {
    const queue: { test: TestItem; data: ITestCase }[] = [];
    const run = this.ctrl.createTestRun(request);

    const discoverTests = async (tests: Iterable<TestItem>) => {
      for (const test of tests) {
        if (request.exclude?.includes(test)) {
          continue;
        }

        const data = testData.get(test)!;
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

    discoverTests(request.include ?? gatherTestItems(this.ctrl.items)).then(
      runTestQueue,
    );
  };

  runHandler = (request: TestRunRequest, cancellation: CancellationToken) => {
    if (!request.continuous) {
      return this.startTestRun(request);
    }

    if (request.include === undefined) {
      this.watchingTests.set("ALL", request.profile);
      cancellation.onCancellationRequested(() =>
        this.watchingTests.delete("ALL"),
      );
    } else {
      request.include.forEach((item) =>
        this.watchingTests.set(item, request.profile),
      );
      cancellation.onCancellationRequested(() =>
        request.include!.forEach((item) => this.watchingTests.delete(item)),
      );
    }
  };

  dispose() {
    this.subscriptions.forEach((s) => s.dispose());
    this.ctrl.dispose();
  }
}

export async function addTestExplorerFeature(context: ExtensionContext) {
  let testExplorerFeature: TestExplorerFeature | null = null;

  const testExplorerEnabled = workspace
    .getConfiguration("phpunit")
    .get<boolean>("testExplorer.enabled", false);
  if (testExplorerEnabled) {
    testExplorerFeature = new TestExplorerFeature(
      tests.createTestController("phpunitTestController", "Phpunit"),
    );
    context.subscriptions.push(testExplorerFeature);
  }

  workspace.onDidChangeConfiguration((event) => {
    if (event.affectsConfiguration("phpunit.testExplorer.enabled")) {
      const testExplorerEnabled = workspace
        .getConfiguration("phpunit")
        .get("testExplorer.enabled");
      if (testExplorerEnabled && !testExplorerFeature) {
        testExplorerFeature = new TestExplorerFeature(
          tests.createTestController("phpunitTestController", "Phpunit"),
        );
        context.subscriptions.push(testExplorerFeature);
      } else if (testExplorerFeature) {
        const idx = context.subscriptions.findIndex(
          (t) => t == testExplorerFeature,
        );
        context.subscriptions.splice(idx, 1);
        testExplorerFeature.dispose();
        testExplorerFeature = null;
      }
    }
  });
}

function getWorkspaceTestPatterns() {
  if (!workspace.workspaceFolders) {
    return [];
  }

  const testExplorerPattern = workspace
    .getConfiguration("phpunit")
    .get("testExplorer.include", "**/tests/**/*Test.php");

  return workspace.workspaceFolders.map((workspaceFolder) => ({
    workspaceFolder,
    pattern: new RelativePattern(workspaceFolder, testExplorerPattern),
    exclude: new RelativePattern(
      workspaceFolder,
      "**/{.git,node_modules,vendor}/**",
    ),
  }));
}

async function updateNodeForDocument(
  controller: TestController,
  e: TextDocument,
) {
  if (e.uri.scheme !== "file") {
    return;
  }

  if (!e.uri.path.endsWith("Test.php")) {
    return;
  }

  const wsPattern = getWorkspaceTestPatterns().find(({ workspaceFolder }) =>
    e.uri.fsPath.startsWith(workspaceFolder.uri.fsPath),
  );
  if (!wsPattern) {
    return;
  }

  const { commonDirectory } = await getFilesAndCommonDirectory(
    wsPattern.pattern,
    wsPattern.exclude,
  );
  await createOrUpdateFromPath(controller, e.uri.fsPath, commonDirectory);
}

async function findInitialTests(
  controller: TestController,
  pattern: GlobPattern,
  exclude: GlobPattern,
) {
  const { files, commonDirectory } = await getFilesAndCommonDirectory(
    pattern,
    exclude,
  );

  for (const file of files) {
    await createOrUpdateFromPath(controller, file.fsPath, commonDirectory);
  }
}

async function getFilesAndCommonDirectory(
  pattern: GlobPattern,
  exclude: GlobPattern,
) {
  const files = await workspace.findFiles(pattern, exclude);
  const directories = files.map((file) => path.dirname(file.fsPath));
  const commonDirectory = directories.reduce((common, dir) => {
    let i = 0;
    while (i < common.length && common[i] === dir[i]) {
      i++;
    }
    return common.substring(0, i);
  }, directories[0]);

  return { files, commonDirectory };
}

function startWatchingWorkspace(
  controller: TestController,
  fileChangedEmitter: EventEmitter<Uri>,
) {
  return getWorkspaceTestPatterns().map(
    ({ workspaceFolder, pattern, exclude }) => {
      const watcher = workspace.createFileSystemWatcher(pattern);

      watcher.onDidCreate(async (uri) => {
        const document = await workspace.openTextDocument(uri);
        updateNodeForDocument(controller, document);
        fileChangedEmitter.fire(uri);
      });
      watcher.onDidChange(async (uri) => {
        deleteFromUri(controller, controller.items, uri);

        const document = await workspace.openTextDocument(uri);
        await updateNodeForDocument(controller, document);

        fileChangedEmitter.fire(uri);
      });
      watcher.onDidDelete((uri) =>
        deleteFromUri(controller, controller.items, uri),
      );

      findInitialTests(controller, pattern, exclude);

      return watcher;
    },
  );
}
