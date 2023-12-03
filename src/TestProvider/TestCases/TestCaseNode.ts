import { Range } from "vscode";

export type TestCaseNodeKind = 'namespace' | 'class' | 'method';

export class TestCaseNode {
  constructor(
    public kind: TestCaseNodeKind,
    public name: string,
    public range: Range,
    public tags: string[] = [],
    public children: TestCaseNode[] = [],
  ) {}
}
