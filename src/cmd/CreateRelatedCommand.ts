import * as fs from 'fs-extra'
import * as vscode from 'vscode'
import * as os from 'os'
import * as _ from '../inc'
import {Command, TextFile, IMatchedDtpl, render} from '../lib/'

interface IPoint {
  x: number
  y: number
}

interface IMoreExtendRelated extends _.IExtendRelated {
  tf: TextFile
  dtpl: IMatchedDtpl | null
}

export class CreateRelatedCommand extends Command {
  private related: IMoreExtendRelated[]
  private infos: Array<{content: string | undefined, injected: boolean}> = []

  /**
   * 创建关联文件
   *
   * related 所关联的文件都是不存在的
   * @param {TextFile} refFile
   * @param {IMatchedDtpl} refDtpl
   * @param {_.IExtendRelated[]} related
   * @memberof CreateRelatedCommand
   */
  constructor(private editor: vscode.TextEditor, refDtpl: IMatchedDtpl, related: _.IExtendRelated[]) {
    super()

    this.related = related.map(r => {
      let tf = new TextFile(r.filePath)
      let dtpl = tf.getDtpl()
      if (dtpl) dtpl.data.ref = refDtpl.data
      return {...r, tf, dtpl}
    })
  }

  async execute(): Promise<boolean> {
    let result = await _.series(this.related, async (r) => {
      _.log('CreateRelatedCommand 开始创建文件 ' + _.getRelativeFilePath(r.filePath))
      fs.ensureFileSync(r.filePath)
      if (r.dtpl) {
        let content = render(r.dtpl.templatePath, r.dtpl.data)
        fs.writeFileSync(r.filePath, content)
      }

      // 注入引用
      let editor = this.editor
      let {reference, begin, end, smartInsertStyle} = r
      let injected = !!reference
      let content: string | undefined
      if (reference) {
        content = this.editor.document.getText()

        if (begin == null && end == null && smartInsertStyle && _.isJsEditor(editor)) {
          // 计算出 begin 坐标
          let rtn = calculateStartInjectPoint(content, reference)
          begin = rtn.begin
          end = rtn.end
          if (!end) reference = os.EOL + reference + os.EOL
        }

        let s = {x: 0, y: 0, ...(begin || {})}
        let e = end ? {...s, ...end} : null

        let start = new vscode.Position(s.x, s.y)

        if (e && (e.x > s.x || e.x === s.x && e.y > s.x)) {
          await _.setEditorContentAsync(editor, reference, new vscode.Range(start, new vscode.Position(e.x, e.y)))
        } else {
          await _.setEditorContentAsync(editor, reference, start)
        }
      }

      await _.openFile(r.filePath)
      this.infos.push({injected, content})
      return true
    })

    return result.every(r => r)
  }

  async rollback(): Promise<boolean> {
    let result = await _.series(this.related, async (r, i) => {
      _.log('CreateRelatedCommand 开始撤销创建的文件 ' + _.getRelativeFilePath(r.filePath))
      // 撤消注入的引用
      let info = this.infos[i]
      if (info.injected && info.content && _.getFileContent(r.filePath) !== info.content) {
        await _.setFileContentAsync(r.filePath, info.content)
      }

      await _.closeFile(r.filePath)
      fs.unlinkSync(r.filePath)
      return true
    })
    return result.every(r => r)
  }
}

function calculateStartInjectPoint(content: string, reference: string): {begin: IPoint, end?: IPoint} {
  let startLine = 0
  // 去掉文件开头的注释行
  if (/^(\s*\/*[\s\S]*?\*\/)/.test(content)) {
    startLine = RegExp.$1.split(/\r?\n/).length
  }

  let lines = content.split(/\r?\n/)


  let begin: IPoint | undefined
  let end: IPoint | undefined

  const requireRegExp = /^\s*(\/\/)?\s*(import|(var|let|const)\s+\w+\s+=\s+require)\b/

  let lastImportLineNumber = startLine
  for (let i = startLine; i < lines.length; i++) {
    let text = lines[i]
    if (text.indexOf(reference) >= 0) {
      begin = {x: i, y: 0}
      end = {x: i, y: text.length}
    }
    if (requireRegExp.test(text)) lastImportLineNumber = i
  }

  if (begin && end) {
    return {begin, end}
  } else {
    return {begin: {x: Math.min(lastImportLineNumber + 1, lines.length - 1), y: 0}}
  }
}

