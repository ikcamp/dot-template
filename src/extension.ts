'use strict'

import * as vscode from 'vscode'
import {createScriptFile, createStyleFile, createReferenceFile} from './createFile'
import {DtplAutoCompletion} from './DtplAutoCompletion'
import {DtplHoverProvider} from './DtplHoverProvider'

export function activate(context: vscode.ExtensionContext) {

  // console.log('Congratulations, your extension "dot-template" is now active!')

  const dtplDocumentSelector = 'dtpl'
  context.subscriptions.push(
    vscode.languages.registerHoverProvider(dtplDocumentSelector, new DtplHoverProvider()),
    vscode.languages.registerCompletionItemProvider(dtplDocumentSelector, new DtplAutoCompletion(), '$', '.', '${'),
    vscode.commands.registerCommand('extension.createScriptFile', createScriptFile),
    vscode.commands.registerCommand('extension.createStyleFile', createStyleFile),
    vscode.commands.registerCommand('extension.createReferenceFile', createReferenceFile)
  )
}

export function deactivate() {
}
