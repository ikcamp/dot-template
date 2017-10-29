import * as vscode from 'vscode'
import * as fs from 'fs-extra'
import * as path from 'path'

import {TextFile, Commander} from './lib/'
import * as _ from './inc/'
import * as c from './cmd'

export class Creater {

  //#region base
  private fileSystemWatcher: vscode.FileSystemWatcher
  /**
   * 标识当前正在使用 命令，fileSystemWatcher 监听到的文件变化不算数
   */
  private commanding = false
  private cmd(fn: () => Promise<any>) {
    return async () => {
      this.commanding = true
      try {
        await fn.apply(this)
      } catch (e) {
        console.error('dtpl 执行命令报错了！')
        console.error(e)
      }
      this.commanding = false
    }
  }

  private cmder = new Commander(1)

  // 暴躁在外面的方法需要 autobind
  createTemplateFile = this.cmd(this._createTemplateFile)
  createRelatedFile = this.cmd(this._createRelatedFile)
  rollbackCreates = this.cmd(async () => {
    this.cmder.hasPrev
      ? await this.cmder.prev()
      : await this.cmder.next()
  })


  constructor() {
    _.log('Creater init')

    // 注册事件
    this.fileSystemWatcher = vscode.workspace.createFileSystemWatcher('**/*', false, true, true)
    this.fileSystemWatcher.onDidCreate(this.createFileListener.bind(this))
  }
  //#endregion

  private async createTemplateFolder(folder: string): Promise<boolean> {
    return true
  }

  private async _createTemplateFile() {
    const editor = _.getActiveEditor()

    if (editor) {
      let currentfile = editor.document.fileName
      let content = editor.document.getText()

      if (content.trim()) { // 有内容时
        // 开个小灶
        // js 文件可以自动检查引用了哪些不存在的文件，然后创建它们
        if (_.isJsEditor(editor)) {
          let notExistFiiles = _.findJsRelatedFiles(currentfile, content).filter(f => !fs.existsSync(f))
          if (notExistFiiles.length) return await this.createFiles(notExistFiiles)
        }

        // 尝试创建关联文件
        if (await this._createRelatedFile()) return true

        // 询问是否要创建新的文件
        const input = await vscode.window.showInputBox({placeHolder: '请输入要创建的文件名（相对当前文件的路径，多个文件用";"分隔）'})
        return await this.createFiles(input, path.dirname(currentfile))
      } else {
        return await this.createFiles(currentfile)
      }
    } else {
      const input = await vscode.window.showInputBox({placeHolder: '请输入要创建的文件名（相对于根目录，多个文件用";"分隔）'})
      return await this.createFiles(input, _.rootPath)
    }
  }

  private async _createRelatedFile(): Promise<boolean> {
    if (!vscode.window.activeTextEditor) {
      _.warning('需要至少有一个编辑中的文件才能创建关联文件')
      return false
    }

    let editor = vscode.window.activeTextEditor
    let currentfile = editor.document.fileName
    let tf = new TextFile(currentfile)
    let dtpl = tf.getDtpl()
    if (!dtpl) return false
    let _related = dtpl.template.related ? dtpl.template.related(dtpl.data, tf.content) : null
    let related = !_related ? [] : Array.isArray(_related) ? _related : [_related]

    let extendRelated: _.IExtendRelated[] = related
        .map(r => {
          let filePath = path.resolve(r.relativePath[0] === '.' ? path.dirname(currentfile) : _.rootPath, r.relativePath)
          return {...r, filePath}
        })
        .filter(r => !fs.existsSync(r.filePath)) // 确保关联的文件不存在

    if (!extendRelated.length) return false

    return await this.cmder.add(new c.CreateRelatedCommand(editor, dtpl, extendRelated))
  }

  dispose() {
    if (this.fileSystemWatcher) this.fileSystemWatcher.dispose()
    _.log('Creater destroy')
  }

  private createFileListener(uri: vscode.Uri) {
    if (uri.scheme !== 'file' || this.commanding) return

    let filepath = uri.path
    let stats = fs.statSync(filepath)
    let relativePath = _.getRelativeFilePath(filepath)
    if (stats.isFile()) {
      // 确保是个空文件，防止此文件是通过其它程序创建的带内容的文件
      if (_.getActiveFile() === uri.path && !fs.readFileSync(filepath).toString().trim()) {
        _.log(`监听到创建了文本文件 ${relativePath}`)
        this.createFiles(filepath)
      }
    } else if (stats.isDirectory()) {
      _.log(`监听到创建了文件夹 ${relativePath}`)
      this.createTemplateFolder(filepath)
    }
  }

  /**
   * 创建文件并注入模板
   *
   * empty 表示文件不存在或者内容为空
   *
   * @param filepahts 要创建的文件的路径
   * @param relativeDir 要创建的文件的路径的相对目录
   * @param open 是否打开创建好的文件
   */
  private async createFiles(filepahts: undefined | string | string[], relativeDir?: null | string, open: boolean = true): Promise<boolean> {
    let files: string[] = []
    if (!filepahts) return false
    if (typeof filepahts === 'string') files = filepahts.split(';')
    else files = filepahts

    files = files
      .map(f => f.trim())
      .filter(f => !!f) // 文件不能为空
      .map(f => relativeDir ? path.resolve(relativeDir, f) : path.resolve(f)) // 使用绝对路径
      .filter(f => !fs.existsSync(f) || fs.readFileSync(f).toString().trim() === '') // 确保文件不存在

    if (!files.length) return false

    return await this.cmder.add(new c.CreateFilesCommand(files, true))
  }
}

