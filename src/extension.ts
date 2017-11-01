'use strict'

import * as vscode from 'vscode'
import {DtplAutoCompletion} from './DtplAutoCompletion'
import {DtplHoverProvider} from './DtplHoverProvider'

import {Application} from './core/Application'
import {VscodeEditor} from './adapter/VscodeEditor'

export function activate(context: vscode.ExtensionContext) {
  const dtplDocumentSelector = 'dtpl'

  const editor = new VscodeEditor()
  const app = new Application(editor)

  context.subscriptions.push(
    app,
    vscode.languages.registerHoverProvider(dtplDocumentSelector, new DtplHoverProvider()),
    vscode.languages.registerCompletionItemProvider(dtplDocumentSelector, new DtplAutoCompletion(), '$', '.', '${'),
    vscode.commands.registerCommand('extension.createTemplateFile', app.createTemplateFiles),
    vscode.commands.registerCommand('extension.createRelatedFiles', app.createRelatedFiles),
    vscode.commands.registerCommand('extension.undoOrRedo', app.undoOrRedo)
  )
}

