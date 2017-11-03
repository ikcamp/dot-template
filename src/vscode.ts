import * as vscode from 'vscode'
import {App, AutoCompletion, HoverProvider} from './apps/vscode/'

export function activate(context: vscode.ExtensionContext) {
  const dtplDocumentSelector = 'dtpl'
  const app = new App()

  context.subscriptions.push(
    app,
    vscode.languages.registerHoverProvider(dtplDocumentSelector, new HoverProvider()),
    vscode.languages.registerCompletionItemProvider(dtplDocumentSelector, new AutoCompletion(), '$', '.', '${'),
    vscode.commands.registerCommand('extension.createTemplateFile', app.createTemplateFiles),
    vscode.commands.registerCommand('extension.createRelatedFiles', app.createRelatedFiles),
    vscode.commands.registerCommand('extension.undoOrRedo', app.undoOrRedo)
  )

  return app
}

