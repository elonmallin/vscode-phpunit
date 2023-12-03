import { Range, Uri } from "vscode";
import { Class, CommentBlock, Engine, Identifier, Method, Namespace } from 'php-parser';
import { ITestCase, TestCaseNode, TestClass, TestMethod } from "./TestCases";

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

export class TestFileParser {
  public parse = (text: string, uri: Uri): Array<TestCaseNode> => {
    const ast = engine.parseCode(text, uri.fsPath);
  
    const testCaseNodes = new Array<TestCaseNode>();
    for (const node of ast.children) {
      if (node.kind === 'class') {
        testCaseNodes.push(this.parseClass(node as Class, uri));
      } else if (node.kind === 'namespace') {
        testCaseNodes.push(this.parseNamespace(node as Namespace, uri));
      }
    }
  
    return testCaseNodes;
  };
  
  private parseNamespace(node: Namespace, uri: Uri): TestCaseNode {
    const testCaseNode = new TestCaseNode('namespace', node.name, new Range(node.loc!.start.line - 1, 0, node.loc!.end.line - 1, 0));
  
    for (const child of node.children) {
      if (child.kind === 'class') {
        testCaseNode.children.push(this.parseClass(child as Class, uri));
      }
    }
  
    return testCaseNode;
  }
  
  private parseClass(node: Class, uri: Uri): TestCaseNode {
    const className = typeof node.name === 'string' ? node.name : (node.name as Identifier).name;
    const testCaseNode = new TestCaseNode('class', className, new Range(node.loc!.start.line - 1, 0, node.loc!.end.line - 1, 0));
  
    for (const child of node.body) {
        if (child.kind !== 'method') {
            continue;
        }
  
        const testCaseMethodNode = this.parseMethod(child as Method, uri);
        if (testCaseMethodNode) {
          testCaseNode.children.push(testCaseMethodNode);
        }
    }
  
    return testCaseNode;
  }
  
  private parseMethod(node: Method, uri: Uri): TestCaseNode | null {
    const leadingComments = node.leadingComments || [];
    const hasTestAnnotation = leadingComments.find((comment: CommentBlock) => {
        return comment.kind === 'commentblock' && comment.value.indexOf('* @test') != -1;
    });
  
    const methodName = typeof node.name === 'string' ? node.name : (node.name as Identifier).name;
  
    if (!methodName.startsWith('test') && !hasTestAnnotation) {
        return null;
    }
  
    const range = new Range(node.loc!.start.line - 1, 0, node.loc!.end.line - 1, 0);
  
    return new TestCaseNode('method', methodName, range);
  }
}
