import * as fs from 'fs-extra'
import * as path from 'path'

import {Command, ICommandInitOptions} from './Command'
import {Application} from '../Application'
import {IRelated, series} from '../common'
import {Source} from '../file/'

interface IExtendedRelated extends IRelated {
  source: Source
  filePath: string
}

interface IPoint {
  row: number
  col: number
}

export class CreateRelatedFilesCommand extends Command {
  private relatedSources: IExtendedRelated[]
  private infos: Array<{content: string, injected: boolean}> = []

  /**
   * 创建关联文件
   *
   * relatedFiles 所关联的文件都是不存在的
   */
  constructor(textFile: string, app: Application, options: ICommandInitOptions) {
    super('CreateRelatedFilesCommand', app, options)
    let rs: IExtendedRelated[] = []
    if (fs.existsSync(textFile) && fs.statSync(textFile).isFile()) {
      let source = this.app.createSource(textFile)
      let tpl = source.match(false)
      rs = (tpl ? tpl.getRelatedSources() : [])
        .map(r => {
          let p = r.relativePath
          let filePath = path.resolve(p[0] === '.' ? path.dirname(source.filePath) : this.app.rootPath, p)
          return {...r, filePath, source: this.app.createSource(filePath)}
        })
      rs = rs.filter(r => !fs.existsSync(r.filePath)) // 确保关联的文件不存在
    }

    if (rs.length) {
      this.relatedSources = rs
    } else {
      this.invalid = true
    }
  }

  private replace(content: string, replacer: string, begin: IPoint, end: IPoint | null): string {
    let lines = content.split(/\r?\n/)
    return lines.reduce((res: string[], line, i) => {
      if (i === begin.row) {
        let prefix = line.substr(0, begin.col) + replacer
        if (!end) {
          res.push(prefix + line.substr(begin.col))
        } else if (i === end.row) {
          res.push(prefix + line.substr(end.col))
        } else {
          res.push(prefix)
        }
      } else if (i > begin.row && end && i <= end.row) {
        if (i === end.row) {
          res.push(line.substr(end.col))
        }
      } else {
        res.push(line)
      }
      return res
    }, []).join(this.app.editor.EOL)
  }

  async execute(): Promise<boolean> {
    const {app} = this
    let {editor, render} = app
    let result = await series(this.relatedSources, async (r) => {
      this.debug('开始创建文件 %f', r.filePath)
      await this.createFileAsync(r.filePath, '')

      let tpl = r.source.match(false)
      if (tpl && false === await this.setFileContentAsync(r.filePath, render.renderFile(tpl.filePath, tpl.data), '')) return false

      // 注入引用
      let {reference, begin, end, smartInsertStyle} = r
      let injected = !!reference
      let content = ''
      if (reference) {
        content = editor.getFileContent(r.source.filePath)

        if (begin == null && end == null && smartInsertStyle && editor.isJsFileOrTsFile(r.source.filePath)) {
          // 计算出 begin 坐标
          let rtn = calculateStartInjectPoint(content, reference)
          begin = rtn.begin
          end = rtn.end
          if (!end) reference = editor.EOL + reference + editor.EOL
        }

        let s = {row: 0, col: 0, ...(begin || {})}
        let e = end ? {...s, ...end} : null
        let newContent = this.replace(content, reference, s, e)
        if (newContent !== content && false === await this.setFileContentAsync(r.source.filePath, newContent, content)) return false
      }

      await editor.openFileAsync(r.filePath)
      this.infos.push({injected, content})
      return true
    })

    return result.every(r => r)
  }

  async rollback(): Promise<boolean> {
    let {editor} = this.app
    let result = await series(this.relatedSources, async (r, i) => {
      if (fs.existsSync(r.filePath)) {
        this.debug('开始撤销文件 %f' + r.filePath)
        let currentcontent = editor.getFileContent(r.filePath)
        await this.unlinkFileAsync(r.filePath, currentcontent)
        this.debug('文件 %f 撤销成功', r.filePath)
      }

      // 撤消注入的引用
      if (fs.existsSync(r.source.filePath)) {
        let info = this.infos[i]
        if (info.injected && info.content) {
          let currentcontent = editor.getFileContent(r.source.filePath)
          if (currentcontent !== info.content && false === await this.setFileContentAsync(r.source.filePath, info.content, currentcontent)) return false
        }
      }

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
      begin = {row: i, col: 0}
      end = {row: i, col: text.length}
    }
    if (requireRegExp.test(text)) lastImportLineNumber = i
  }

  if (begin && end) {
    return {begin, end}
  } else {
    return {begin: {row: Math.min(lastImportLineNumber + 1, lines.length - 1), col: 0}}
  }
}

