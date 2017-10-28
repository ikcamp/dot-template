import * as vscode from 'vscode'
import * as fs from 'fs-extra'
import * as path from 'path'
import * as os from 'os'

import {TextFile} from './TextFile'
import * as _ from './inc/'

export class Creater {
  static autobinds = ['createFileListener', 'createTemplateFile', 'createRelatedFile']

  private jsLanguageIds = ['typescriptreact', 'javascriptreact', 'typescript', 'javascript']
  private fileSystemWatcher: vscode.FileSystemWatcher
  /**
   * 标识当前正在使用 命令，fileSystemWatcher 监听到的文件变化不算数
   */
  private commanding = false
  private cmd(fn: any) {
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

  constructor() {
    _.log('Creater init')

    Creater.autobinds.forEach((fn: keyof Creater) => this[fn] = this[fn].bind(this))

    // 注册事件
    this.fileSystemWatcher = vscode.workspace.createFileSystemWatcher('**/*', false, true, true)
    this.fileSystemWatcher.onDidCreate(this.createFileListener)
  }


  /**
   * 向文件 file 中插入模板内容
   *
   * @param {string} file              要插入模板内容的文件
   * @param {(string|null)} [refFile]    引用的文件，表示当前要插入模板内容的文件是通过 refFile 生成的
   * @param {boolean} [open=false]     是否打开该文件
   */
  async insertTemplate(file: string, open: boolean = false): Promise<boolean> {
    let tf = new TextFile(file)

    if (tf.content.trim() !== '') {
      _.warning(`文件 ${tf.relative} 已经有内容了，无法注入模板内容`)
      return false
    }

    _.log(`开始获取 ${tf.relative} 文件的模板数据`)

    let dtpl = tf.getDtpl()
    if (!dtpl) return false

    _.log(`开始渲染文件 ${tf.relative}`)
    let content = tf.render(dtpl.templatePath, dtpl.data)

    if (open || vscode.window.activeTextEditor && _.getActiveFile() === file) {
      let editor = await this.openFile(file)

      // 有种情况是文件有内容，但没有保存到本地，只有通过 editor 才能获取到它的内容
      // 测试发现 vscode 缓存比较严重，没有内容读取出来也变成了有内容，反正通过此方法注入的内容可以使用 回退 来清除修改，所以就不判断了
      // if (editor.document.getText().trim() !== '') {
      //   _.warning(`文件 ${tf.relative} 已经有内容了，无法注入模板内容`)
      //   return false
      // }
      await editor.insertSnippet(new vscode.SnippetString(content))
      return await editor.document.save()
    } else {
      fs.writeFileSync(file, content)
      return true
    }
  }

  async createTemplateFolder(folder: string) {

  }

  createTemplateFile = this.cmd(this._createTemplateFile)
  createRelatedFile = this.cmd(this._createRelatedFile)

  private async _createTemplateFile() {
    this.commanding = true
    const editor = _.getActiveEditor()
    /** 将输入的字段转化成一个文件数组 */
    const processInput = (input: string | undefined): string[] => input ? input.split(';').map(i => i.trim()).filter(i => !!i) : []

    if (editor) {
      let currentfile = editor.document.fileName
      let content = editor.document.getText()

      if (content.trim()) { // 有内容时
        // 开个小灶
        // js 文件可以自动检查引用了哪些不存在的文件，然后创建它们
        if (this.jsLanguageIds.includes(editor.document.languageId)) {
          let notExistFiiles = _.findJsRelatedFiles(currentfile, content).filter(f => !fs.existsSync(f))
          if (notExistFiiles.length) {
            return await this.insertAndOpenFiles(notExistFiiles)
          }
        }

        // 尝试创建关联文件
        if (await this._createRelatedFile()) return true

        // 询问是否要创建新的文件
        const input = await vscode.window.showInputBox({placeHolder: '请输入要创建的文件名（相对当前文件的路径，多个文件用";"分隔）'})
        return await this.insertAndOpenFiles(processInput(input).map(f => path.resolve(path.dirname(currentfile), f)))
      } else {
        return await this.insertTemplateToActiveFile()
      }

    } else {
      const input = await vscode.window.showInputBox({placeHolder: '请输入要创建的文件名（相对于根目录，多个文件用";"分隔）'})
      return await this.insertAndOpenFiles(processInput(input).map(f => path.resolve(_.rootPath, f)))
    }
  }

  private async _createRelatedFile(): Promise<boolean> {
    if (!vscode.window.activeTextEditor) {
      _.warning('需要至少有一个编辑中的文件才能创建关联文件')
      return false
    }

    let editor = vscode.window.activeTextEditor
    let tf = new TextFile(editor.document.fileName)
    let dtpl = tf.getDtpl()
    if (!dtpl) return false
    let related = dtpl.template.related ? dtpl.template.related(dtpl.data, tf.content) : null
    if (!related) return false

    let {relativePath} = related
    let relatedFilepath = path.resolve(relativePath[0] ? path.dirname(tf.filepath) : _.rootPath, relativePath)

    let relatedTextFile = new TextFile(relatedFilepath)
    let relatedDtpl = relatedTextFile.getDtpl()

    if (!relatedDtpl) { // 关联的文件不需要模板，直接创建一个新文件
      if (relatedTextFile.exists) return false
      await this.injectReference(related, editor)
      return await this.createAndOpenFile(relatedFilepath)
    } else {
      if (!relatedTextFile.empty) return false
      await this.injectReference(related, editor)
      relatedDtpl.data.ref = dtpl.data
      let content = relatedTextFile.render(relatedDtpl.templatePath, relatedDtpl.data)
      return await this.createAndOpenAndFillFile(relatedFilepath, content)
    }
  }

  dispose() {
    if (this.fileSystemWatcher) this.fileSystemWatcher.dispose()
    _.log('Creater destroy')
  }

  private async openFile(file: string): Promise<vscode.TextEditor> {
    if (vscode.window.activeTextEditor && _.getActiveFile() === file) {
      return vscode.window.activeTextEditor
    }
    let doc = await vscode.workspace.openTextDocument(file)
    return await vscode.window.showTextDocument(doc)
  }

  // TODO: 根据执行结果，记录命令，方便回滚
  private async injectReference(related: _.IRelated, editor: vscode.TextEditor) {
    let {reference, col, row, smartInsertStyle} = related
    if (!reference) return
    if (col == null && row == null && smartInsertStyle && this.jsLanguageIds.includes(editor.document.languageId)) {
      analyzeInsertReferenceStyleRow(reference, editor)
    } else {
      col = col || 0
      row = row || 0
      await editor.insertSnippet(new vscode.SnippetString(reference), new vscode.Position(row, col))
    }
    return true
  }

  // TODO: 根据执行结果，记录命令，方便回滚
  private async insertAndOpenFiles(files: string[]): Promise<boolean> {
    files = files.filter(f => !fs.existsSync(f)) // 批量创建只允许创建不存在的文件，避免失误
    let task = files.reduce(
      (prev, file) => {
        return async () => {
          await prev()
          fs.ensureFileSync(file)
          return await this.insertTemplate(file, true)
        }
      },
      async () => true
    )
    return await task()
  }

  // TODO: 根据执行结果，记录命令，方便回滚
  private async insertTemplateToActiveFile(): Promise<boolean> {
    let af = _.getActiveFile()
    if (af) {
      return await this.insertTemplate(af, false)
    } else {
      return false
    }
  }

  // TODO: 根据执行结果，记录命令，方便回滚
  private async createAndOpenFile(file: string): Promise<boolean> {
    fs.ensureFileSync(file)
    await this.openFile(file)
    return true
  }

  // TODO: 根据执行结果，记录命令，方便回滚
  private async createAndOpenAndFillFile(file: string, fillContent: string): Promise<boolean> {
    fs.ensureFileSync(file)
    let editor = await this.openFile(file)
    await editor.insertSnippet(new vscode.SnippetString(fillContent))
    return editor.document.save()
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
        this.insertTemplateToActiveFile()
      }
    } else if (stats.isDirectory()) {
      _.log(`监听到创建了文件夹 ${relativePath}`)
      this.createTemplateFolder(filepath)
    }
  }
}


function analyzeInsertReferenceStyleRow(reference: string, editor: vscode.TextEditor) {
  let isStyleRefExists = false
  let lastImportLineNumber = -1 // 文件中使用 import 的最后一行

  eachDocumentLine(editor.document, (line, lineNumber) => {
    let {text} = line
    if (text.indexOf(reference) >= 0) {
      isStyleRefExists = true

      // 引用的文件被 // 注释掉了
      if (/^(\s*\/\/\s*)/.test(text)) {
          editor.edit(eb => {
            let startPos = new vscode.Position(lineNumber, 0)
            let endPos = new vscode.Position(lineNumber, RegExp.$1.length)
            eb.replace(new vscode.Range(startPos, endPos), '')
          })
        }
      }

    if (/^\s*(\/\/)?\s*(import|(var|let|const)\s+\w+\s+=\s+require)\b/.test(text)) lastImportLineNumber = lineNumber
    return !isStyleRefExists // 找到了就不用再找了
  })

  // 文件中没有引用样式引用的话，就手动添加引用
  if (!isStyleRefExists) {
    editor.edit(eb => eb.insert(new vscode.Position(lastImportLineNumber + 1, 0), `${os.EOL}${reference}${os.EOL}`))
  }
}

function eachDocumentLine(doc: vscode.TextDocument, fn: (line: vscode.TextLine, index: number) => any) {
  let lineCount = doc.lineCount
  for (let i = 0; i < lineCount; i++) {
    if (fn(doc.lineAt(i), i) === false) break
  }
}
