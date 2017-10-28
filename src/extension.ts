'use strict'

import * as vscode from 'vscode'
import {DtplAutoCompletion} from './DtplAutoCompletion'
import {DtplHoverProvider} from './DtplHoverProvider'

import {Creater} from './Creater'

export function activate(context: vscode.ExtensionContext) {
  const dtplDocumentSelector = 'dtpl'

  const creater = new Creater()
  context.subscriptions.push(
    creater,
    vscode.languages.registerHoverProvider(dtplDocumentSelector, new DtplHoverProvider()),
    vscode.languages.registerCompletionItemProvider(dtplDocumentSelector, new DtplAutoCompletion(), '$', '.', '${'),
    vscode.commands.registerCommand('extension.createTemplateFile', creater.createTemplateFile),
    vscode.commands.registerCommand('extension.createRelatedFile', creater.createRelatedFile),
  )
}

