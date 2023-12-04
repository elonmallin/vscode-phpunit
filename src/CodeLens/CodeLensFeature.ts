import { ExtensionContext, workspace, languages, Disposable } from "vscode";
import { PhpCodeLensProvider } from "./PhpCodeLensProvider";
import { PhpunitXmlCodeLensProvider } from "./PhpunitXmlCodeLensProvider";

let phpCodeLensProvider: Disposable | null;
let phpunitXmlCodeLensProvider: Disposable | null;

export function addCodeLensFeature(context: ExtensionContext) {
  const codeLensEnabled = workspace
    .getConfiguration("phpunit")
    .get("codeLens.enabled");
  if (codeLensEnabled) {
    enableCodeLens(context);
  }

  workspace.onDidChangeConfiguration((event) => {
    if (event.affectsConfiguration("phpunit.codeLens.enabled")) {
      const codeLensEnabled = workspace
        .getConfiguration("phpunit")
        .get("codeLens.enabled");
      if (codeLensEnabled) {
        enableCodeLens(context);
      } else {
        disableCodeLens(context);
      }
    }
  });
}

function enableCodeLens(context: ExtensionContext) {
  if (phpCodeLensProvider || phpunitXmlCodeLensProvider) {
    return;
  }

  phpCodeLensProvider = languages.registerCodeLensProvider(
    {
      language: "php",
      scheme: "file",
      pattern: "**/test*/**/*.php",
    },
    new PhpCodeLensProvider(),
  );

  phpunitXmlCodeLensProvider = languages.registerCodeLensProvider(
    {
      language: "xml",
      scheme: "file",
      pattern: "**/phpunit.xml*",
    },
    new PhpunitXmlCodeLensProvider(),
  );

  context.subscriptions.push(phpCodeLensProvider);
  context.subscriptions.push(phpunitXmlCodeLensProvider);
}

function disableCodeLens(context: ExtensionContext) {
  if (!phpCodeLensProvider || !phpunitXmlCodeLensProvider) {
    return;
  }

  const phpCodeLensProviderIdx =
    context.subscriptions.indexOf(phpCodeLensProvider);
  context.subscriptions.splice(phpCodeLensProviderIdx, 1);
  phpCodeLensProvider.dispose();
  phpCodeLensProvider = null;

  const phpunitXmlCodeLensProviderIdx = context.subscriptions.indexOf(
    phpunitXmlCodeLensProvider,
  );
  context.subscriptions.splice(phpunitXmlCodeLensProviderIdx, 1);
  phpunitXmlCodeLensProvider.dispose();
  phpunitXmlCodeLensProvider = null;
}
