'use strict'

import * as vscode from 'vscode'
import {createScriptFile, createStyleFile} from './createFileByTemplate'
import {AutoCompletion} from './AutoCompletion'

export function activate(context: vscode.ExtensionContext) {
  // console.log('Congratulations, your extension "dot-template" is now active!')

  context.subscriptions.push(
    vscode.languages.registerCompletionItemProvider('dtpl', new AutoCompletion(), '$', '.', '${'),
    vscode.commands.registerCommand('extension.createScriptFile', createScriptFile),
    vscode.commands.registerCommand('extension.createStyleFile', createStyleFile)
  )
}

export function deactivate() {
}
