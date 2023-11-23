import { CodeLensProvider, CodeLens, CancellationToken, TextDocument, Range, workspace } from 'vscode';
import { parse, DocumentCstNode } from '@xml-tools/parser';
import { buildAst, XMLElement, } from '@xml-tools/ast';
import { PhpunitArgBuilder } from '../PhpunitCommand/PhpunitArgBuilder';

let lastDocumentText: string;
let lastCodeLenses: Array<CodeLens> = [];

export class PhpunitXmlCodeLensProvider implements CodeLensProvider {
  public provideCodeLenses(document: TextDocument, token: CancellationToken): Array<CodeLens> | Thenable<Array<CodeLens>> {
    if (!workspace.getConfiguration("phpunit").get<boolean>("codeLens.enabled")) {
      return [];
    }

    if (!/phpunit\.xml(\.dist)?/.test(document.fileName)) {
      return [];
    }

    if (document.getText() === lastDocumentText) {
      return lastCodeLenses;
    }

    const { cst, tokenVector } = parse(document.getText());
    const ast = buildAst(cst as DocumentCstNode, tokenVector);

    const codeLenses: Array<CodeLens> = [];

    for (const node of ast.rootElement!.subElements) {
        if (node.name === 'testsuites') {
          codeLenses.push(...this.parseTestSuites(node, document.fileName));
        }
    }

    lastDocumentText = document.getText();
    lastCodeLenses = codeLenses;

    return codeLenses;
  }

  // public resolveCodeLens(codeLens: CodeLens, token: CancellationToken):
  //     CodeLens | Thenable<CodeLens> {
  //   return codeLens;
  // }

  private parseTestSuites(node: XMLElement, fileName: string): CodeLens[] {
    const codeLenses: Array<CodeLens> = [];

    for (const child of node.subElements) {
      if (child.name === 'testsuite') {
        codeLenses.push(this.parseTestSuite(child, fileName));
      }
    }

    if (codeLenses.length > 0) {
      const codeLensRange = new Range(node.position.startLine - 1, 0, node.position.startLine - 1, 0);

      codeLenses.push(new CodeLens(codeLensRange, {
          command: 'phpunit.Test',
          title: 'Run tests',
          arguments: [
            new PhpunitArgBuilder()
              .withConfig(fileName)
          ]
      }));
    }

    return codeLenses;
  }

  private parseTestSuite(node: XMLElement, fileName: string): CodeLens {
    const codeLensRange = new Range(node.position.startLine - 1, 0, node.position.startLine - 1, 0);
    const name = node.attributes.find((attribute) => attribute.key === 'name')!.value!;

    return new CodeLens(codeLensRange, {
        command: 'phpunit.Test',
        title: 'Run test',
        arguments: [
          new PhpunitArgBuilder()
            .withConfig(fileName)
            .addSuite(name)
        ]
    });
  }
}
