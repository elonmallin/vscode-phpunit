import { CodeLensProvider, CodeLens, CancellationToken, TextDocument, Range } from 'vscode';
import { Class, CommentBlock, Engine, Identifier, Method, Node } from 'php-parser';

export class PhpCodeLensProvider implements CodeLensProvider {
  public provideCodeLenses(document: TextDocument, token: CancellationToken): Array<CodeLens> | Thenable<Array<CodeLens>> {
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

    let codeLens: CodeLens[] = [];

    for (const node of ast.children) {
        if (node.kind !== 'class' && node.kind !== 'namespace') {
            continue;
        }

        // If is a class, just parse it directly
        if (node.kind === 'class') {
            codeLens = codeLens.concat(this.parseClass(node as Class));
        } else {
            // If it's a namespace, loop over children to find a class
            // for (const namespaceNode of node.children) {
            //     if (namespaceNode.kind === 'class') {
            //         codeLens = codeLens.concat(this.parseClass(namespaceNode));
            //     }
            // }
        }
    } // parse.children

    return codeLens;
  }

  public resolveCodeLens(codeLens: CodeLens, token: CancellationToken):
      CodeLens | Thenable<CodeLens> {
    return codeLens;
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

        codeLenses.push(new CodeLens(classCodeLensRange, {
            command: 'phpunit.Test',
            title: "Run tests",
            arguments: ["AdditionTest"],
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
        arguments: [methodName],
    });
  }
}
