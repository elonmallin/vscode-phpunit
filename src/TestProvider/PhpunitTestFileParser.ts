import { Range, Uri } from "vscode";
import { Class, CommentBlock, Engine, Identifier, Method, Namespace } from 'php-parser';
import { TestCase } from "./PhpunitTestCase";

const engine = new Engine({
  ast: {
    withPositions: true
  },
  parser: {
    debug: false,
    extractDoc: true,
    suppressErrors: true,
  },
  lexer: {
    all_tokens: false,
    comment_tokens: true,
    mode_eval: false,
    asp_tags: false,
    short_tags: true,
  },
});

export class ParsePhpunitTestFile {
  public parsePhpunitTestFile = (text: string, uri: Uri): Array<TestCase> => {
    const ast = engine.parseCode(text, uri.fsPath);
  
    const testCases = new Array<TestCase>();
    for (const node of ast.children) {
      if (node.kind === 'class') {
        testCases.push(...this.parseClass(node as Class, uri));
      } else if (node.kind === 'namespace') {
        testCases.push(...this.parseNamespace(node as Namespace, uri));
      }
    }
  
    return testCases;
  };
  
  private parseNamespace(node: Namespace, uri: Uri): TestCase[] {
    const testCases: Array<TestCase> = [];
  
    for (const child of node.children) {
      if (child.kind === 'class') {
        testCases.push(...this.parseClass(child as Class, uri));
      }
    }
  
    return testCases;
  }
  
  private parseClass(node: Class, uri: Uri): TestCase[] {
    const testCases = [];
  
    for (const child of node.body) {
        if (child.kind !== 'method') {
            continue;
        }
  
        const testCase = this.parseMethod(child as Method, uri);
        if (testCase) {
          testCases.push(testCase);
        }
    }
  
    if (testCases.length > 0) {
        const range = new Range(node.loc!.start.line - 1, 0, node.loc!.end.line - 1, 0);
        const className = typeof node.name === 'string' ? node.name : (node.name as Identifier).name;
  
        testCases.push(new TestCase(uri.fsPath, className, '', range, 0));
    }
  
    return testCases;
  }
  
  private parseMethod(node: Method, uri: Uri): TestCase | null {
    const leadingComments = node.leadingComments || [];
    const hasTestAnnotation = leadingComments.find((comment: CommentBlock) => {
        return comment.kind === 'commentblock' && comment.value.indexOf('* @test') != -1;
    });
  
    const methodName = typeof node.name === 'string' ? node.name : (node.name as Identifier).name;
  
    if (!methodName.startsWith('test') && !hasTestAnnotation) {
        return null;
    }
  
    const range = new Range(node.loc!.start.line - 1, 0, node.loc!.end.line - 1, 0);
  
    return new TestCase(uri.fsPath, '', methodName, range, 0);
  }
}

