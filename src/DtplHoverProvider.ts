import * as vscode from 'vscode'
import {getDtplFileEnvData, getDtplFileVariableDocument} from './inc/helper'
const {Hover} = vscode

export class DtplHoverProvider implements vscode.HoverProvider {
  provideHover(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken) {
    let lineNumber = position.line
    let lineIndex = position.character

    let line = document.getText(document.lineAt(lineNumber).range)

    let chars = []
    let wordReg = /[\w\.]/
    let startIndex: number
    let endIndex: number
    let startChar: string
    let endChar: string

    let i = lineIndex
    while (i >= 0) {
      startIndex = i
      if (wordReg.test(line[i])) {
        chars.unshift(line[i])
      } else {
        startIndex = i
        break
      }
      i--
    }
    i = lineIndex + 1
    while (i < line.length) {
      if (wordReg.test(line[i])) {
        chars.push(line[i])
      } else {
        endIndex = i
        break
      }
      i++
    }

    if (startIndex == null) return null // 前面一定需要 $，所以如果没有 startIndex，则表示不存在 $ 字符
    startChar = line[startIndex]
    if (endIndex == null) {
      if (startChar !== '$') return null // startChar 一定要是 $，因为 endChar 不可能是 }
    } else {
      endChar = line[endIndex]
      if (!(
        (startChar === '$' && chars.indexOf('.') < 0)
        ||
        ((startChar as string) === '{' && endChar === '}' && startIndex - 1 >= 0 && line[startIndex - 1] === '$')
      )) return null
    }


    let envData = getDtplFileEnvData(vscode.window.activeTextEditor.document.fileName)
    let explain = getDtplFileVariableDocument(chars.join(''), envData)

    return explain ? new Hover(explain) : null
  }
}
