import {CompletionItemProvider, TextDocument, Position, CompletionItem, Range, CompletionItemKind} from 'vscode'
import {TextFile} from './TextFile'
import * as DotProp from 'mora-scripts/libs/lang/DotProp'

const variableRegexp = /\$\{?([\-\w\.]*)$/

export class DtplAutoCompletion implements CompletionItemProvider {
  provideCompletionItems(document: TextDocument, position: Position): CompletionItem[] {
    const start: Position = new Position(position.line, 0)
    const range: Range = new Range(start, position)
    const text: string = document.getText(range)
    const matches = text.match(variableRegexp)
    if (!matches) return []

    let data = new TextFile(document.fileName).getData()

    let prefix = matches[1]
    if (matches[0].indexOf('{') >= 0 && prefix.indexOf('.') > 0) {
      let parts = prefix.split('.')
      prefix = parts.pop() as string
      data = DotProp.get(data, parts.join('.'))
      if (typeof data !== 'object') return []
    }

    return Object.keys(data || {})
      .filter(k => !prefix || k.startsWith(prefix))
      .map(k => {
        let c = new CompletionItem(k, CompletionItemKind.Variable)
        // c.documentation = getDtplFileVariableDocument(k, data)
        c.documentation = 'TODO: 添加文档'
        return c
      })
  }
}
