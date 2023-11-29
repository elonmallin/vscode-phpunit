import { Location, Position, TestController, TestItem, TestMessage, TestRun, Uri, workspace } from "vscode";
import { ParsePhpunitTestFile } from "./PhpunitTestFileParser";
import { TestCase } from "./PhpunitTestCase";

const textDecoder = new TextDecoder('utf-8');
export const testData = new WeakMap<TestItem, TestCase | TestFile>();

export const getContentFromFilesystem = async (uri: Uri) => {
	try {
		const rawContent = await workspace.fs.readFile(uri);
		return textDecoder.decode(rawContent);
	} catch (e) {
		console.warn(`Error providing tests for ${uri.fsPath}`, e);
		return '';
	}
};

export class TestFile {
  constructor(
		private readonly fileName: string
	) { }

  public didResolve = false;

	public async updateFromDisk(controller: TestController, item: TestItem) {
		try {
			const content = await getContentFromFilesystem(item.uri!);
			item.error = undefined;
			this.updateFromContents(controller, content, item);
		} catch (e) {
			item.error = (e as Error).stack;
		}
	}

	/**
	 * Parses the tests from the input text, and updates the tests contained
	 * by this file to be those from the text,
	 */
	public updateFromContents(controller: TestController, content: string, item: TestItem) {
    this.didResolve = true;
    const parser = new ParsePhpunitTestFile();
		const testCases = parser.parsePhpunitTestFile(content, item.uri!);

    for (const testCase of testCases) {
      const tcase = controller.createTestItem(testCase.getId(), testCase.getLabel(), item.uri);
      testData.set(tcase, testCase);
      tcase.range = testCase.range;
      item.children.add(tcase);
    }
	}

  async run(item: TestItem, options: TestRun): Promise<boolean> {
		const start = Date.now();

    let allOk = true;
    for (const [id, child] of item.children) {
      const testCase = testData.get(child);
      if (testCase instanceof TestCase) {
        const ok = await testCase.run(child, options);
        if (!ok) {
          allOk = false;
        }
      }
    }

		const duration = Date.now() - start;

		if (allOk) {
			options.passed(item, duration);

      return true;
		}
    
    const message = new TestMessage('Failed');
    message.location = new Location(item.uri!, new Position(0, 0));
    options.failed(item, new TestMessage('Failed'), duration);

    return false;
	}
}
