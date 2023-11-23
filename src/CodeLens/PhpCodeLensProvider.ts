import { CodeLensProvider, CodeLens, CancellationToken, TextDocument, Range, workspace } from 'vscode';
import { Class, CommentBlock, Engine, Identifier, Method, Namespace } from 'php-parser';
import { PhpunitArgBuilder } from '../PhpunitCommand/PhpunitArgBuilder';

let lastDocumentText: string;
let lastCodeLenses: Array<CodeLens> = [];

export class PhpCodeLensProvider implements CodeLensProvider {
  public provideCodeLenses(document: TextDocument, token: CancellationToken): Array<CodeLens> | Thenable<Array<CodeLens>> {
    if (!workspace.getConfiguration("phpunit").get<boolean>("codeLens.enabled")) {
      return [];
    }

    if (document.getText() === lastDocumentText) {
      return lastCodeLenses;
    }

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

    const ast = engine.parseCode(document.getText(), document.fileName);

    const codeLenses: Array<CodeLens> = [];

    for (const node of ast.children) {
        if (node.kind === 'class') {
          codeLenses.push(...this.parseClass(node as Class));
        } else if (node.kind === 'namespace') {
          codeLenses.push(...this.parseNamespace(node as Namespace));
        }
    }

    for (const codeLens of codeLenses) {
      (codeLens.command!.arguments![0] as PhpunitArgBuilder).addDirectoryOrFile(document.fileName);
    }

    lastDocumentText = document.getText();
    lastCodeLenses = codeLenses;

    return codeLenses;
  }

  // public resolveCodeLens(codeLens: CodeLens, token: CancellationToken):
  //     CodeLens | Thenable<CodeLens> {
  //   return codeLens;
  // }

  private parseNamespace(node: Namespace): CodeLens[] {
    const codeLenses: Array<CodeLens> = [];

    for (const child of node.children) {
      if (child.kind === 'class') {
        codeLenses.push(...this.parseClass(child as Class));
      }
    }

    return codeLenses;
  }

  private parseClass(node: Class): CodeLens[] {
    const codeLenses = [];

    for (const child of node.body) {
        if (child.kind !== 'method') {
            continue;
        }

        const codeLens = this.parseMethod(child as Method);
        if (codeLens) {
          codeLenses.push(codeLens);
        }
    }

    if (codeLenses.length > 0) {
        const classCodeLensRange = new Range(node.loc!.start.line - 1, 0, node.loc!.start.line - 1, 0);
        const className = typeof node.name === 'string' ? node.name : (node.name as Identifier).name;

        codeLenses.push(new CodeLens(classCodeLensRange, {
            command: 'phpunit.Test',
            title: "Run tests",
            arguments: [
              new PhpunitArgBuilder()
                .addFilter(className)
            ],
        }));
    }

    return codeLenses;
  }

  private parseMethod(node: Method): CodeLens | null {
    const leadingComments = node.leadingComments || [];
    const hasTestAnnotation = leadingComments.find((comment: CommentBlock) => {
        return comment.kind === 'commentblock' && comment.value.indexOf('* @test') != -1;
    });

    const methodName = typeof node.name === 'string' ? node.name : (node.name as Identifier).name;

    if (!methodName.startsWith('test') && !hasTestAnnotation) {
        return null;
    }

    const codeLensRange = new Range(node.loc!.start.line - 1, 0, node.loc!.start.line - 1, 0);

    return new CodeLens(codeLensRange, {
        command: 'phpunit.Test',
        title: 'Run test',
        arguments: [
          new PhpunitArgBuilder()
            .addFilter(methodName)
        ],
    });
  }
}
