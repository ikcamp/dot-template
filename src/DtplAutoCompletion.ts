import {CompletionItemProvider, TextDocument, Position, CompletionItem, Range, CompletionItemKind} from 'vscode'
import {getDtplFileEnvData, getDtplFileVariableDocument} from './inc/helper'
import * as DotProp from 'mora-scripts/libs/lang/DotProp'

const variableRegexp = /\$\{?([\-\w\.]*)$/

export class DtplAutoCompletion implements CompletionItemProvider {
  provideCompletionItems(document: TextDocument, position: Position): CompletionItem[] {
    const start: Position = new Position(position.line, 0)
    const range: Range = new Range(start, position)
    const text: string = document.getText(range)
    const matches = text.match(variableRegexp)
    if (!matches) return []

    let envData = getDtplFileEnvData(document.fileName)

    let prefix = matches[1]
    if (matches[0].indexOf('{') >= 0 && prefix.indexOf('.') > 0) {
      let parts = prefix.split('.')
      prefix = parts.pop()
      envData = DotProp.get(envData, parts.join('.'))
      if (typeof envData !== 'object') return []
    }

    return Object.keys(envData)
      .filter(k => !prefix || k.startsWith(prefix))
      .map(k => {
        let c = new CompletionItem(k, CompletionItemKind.Variable)
        c.documentation = getDtplFileVariableDocument(k, envData)
        return c
      })
  }
}
