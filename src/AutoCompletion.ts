import {CompletionItemProvider, TextDocument, Position, CompletionItem, Range, CompletionItemKind} from 'vscode'
import {getEnvData, getLocalCustomEnvData} from './helper'
import * as DotProp from 'mora-scripts/libs/lang/DotProp'

const variableRegexp = /\$\{?([\-\w\.]*)$/

export class AutoCompletion implements CompletionItemProvider {
  provideCompletionItems(document: TextDocument, position: Position): CompletionItem[] {
    const start: Position = new Position(position.line, 0)
    const range: Range = new Range(start, position)
    const text: string = document.getText(range)
    const matches = variableRegexp.test(text)
    if (!matches) return []

    let envData = getEnvData(document.fileName)
    envData = {...envData, ...getLocalCustomEnvData(envData.dirName)}

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
        let c = new CompletionItem(k, CompletionItemKind.Keyword)
        c.documentation = `Example:  ${JSON.stringify(envData[k])}`
        return c
      })
  }
}
