export class TestDiffParser {
  constructor(
    public readonly message: string,
    public readonly expected: string,
    public readonly actual: string) {

    }
}

export function getTestFailedDiff(output: string): TestDiffParser {
  const [message] = /^Failed asserting that .*$/im.exec(output)!;

  if (/--- Expected/ig.test(output)) {
    const expectedMatches = output.match(/^- .*$/igm);
    const expected = expectedMatches!.join('\n');

    const actualMatches = output.match(/^\+ .*$/igm);
    const actual = actualMatches!.join('\n');

    return new TestDiffParser(message, expected, actual);
  } else {
    const [, expected, ,actual] = /^Failed asserting that (.*) (is|are|matches expected) (.*)\.$/im.exec(output)!;

    return new TestDiffParser(message, expected, actual);
  }
}
