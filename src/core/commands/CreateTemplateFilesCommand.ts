import {Command, ICommandInitOptions} from './Command'
import {Application} from '../Application'
import {series} from '../common'
import * as fs from 'fs-extra'
import * as path from 'path'

/**
 * 创建文件并注入模板的命令
 *
 * **注意：**
 *
 * - 文件之前是不存在的
 * - 可以指定多个文件
 *
 */
export class CreateTemplateFilesCommand extends Command {
  files: string[]

  /**
   * 对应文件的创建前的信和，在撤消命令时，要判断内容是否改过了，改过了要弹出确认框
   */
  private infos: Array<{opened: boolean, exists: boolean, newContent: string, content: string}> = []

  /**
   * @param {string[]} files 所有要创建的文件绝对路径，一定要确保文件不存在
   * @param {boolean} [open] 是否要打开这些创建好的文件
   * @memberof CreateFilesCommand
   */
  constructor(files: string[], private open: boolean, app: Application, options: ICommandInitOptions) {
    super('CreateTemplateFilesCommand', app, options)

    let {editor} = this.app
    let {rootPath} = editor
    files = files
      .map(f => f.trim() ? path.resolve(rootPath, f) : '')
      .filter(f => {
        if (!f || f.indexOf(rootPath) < 0) return false // 文件必须要在项目文件夹内

        // 文件不存在，或者文本文件内容为空
        return !fs.existsSync(f) || fs.statSync(f).isFile() && editor.getFileContent(f).trim() === ''
      })
      .reduce((all: string[], f) => { // 去重
        if (all.indexOf(f) < 0) all.push(f)
        return all
      }, [])
    if (!files.length) {
      this.invalid = true
    } else {
      this.files = files
    }
  }

  async execute(): Promise<boolean> {
    const {app} = this
    let {render, editor} = app
    let result = await series(this.files, async (file) => {
      this.debug('开始处理文件 %f', file)
      let src = this.app.createSource(file)
      let tpl = src.match(false)

      let opened = false
      let content: string = ''
      let newContent = tpl ? render.renderFile(tpl.filePath, tpl.data) : ''
      if (tpl) this.debug(`渲染文件 %f`, tpl.filePath)
      let exists = fs.existsSync(file)

      if (exists) {
        content = editor.getFileContent(file)
        opened = editor.isOpened(file)
      } else {
        await this.createFileAsync(file, '')
      }

      this.infos.push({content, exists, opened, newContent})

      if (newContent !== content && await this.setFileContentAsync(file, newContent, content) === false) return false

      if (this.open && !opened) await editor.openFileAsync(file) // 文件打开失败不算错误
      this.debug('处理文件 %f 成功', file)
      return true
    })

    return result.every(r => r)
  }

  async rollback(): Promise<boolean> {
    const {app} = this
    let {editor} = app

    let updates: string[] = []
    this.files.forEach((file, i) => {
      let info = this.infos[i]
      if (info.exists && fs.existsSync(file)) { // 过去和现在都存在
        if (editor.getFileContent(file) !== info.newContent) {
          updates.push(editor.getRelativeFilePath(file))
        }
      }
    })
    if (updates.length && false === await editor.confirm(`文件 ${updates.join(', ')} 更新过了，确认要取消创建这些文件吗？`)) {
      return false
    }

    let result = await series(this.files, async (file, i) => {
      this.debug('开始回滚文件 %f' + file)
      let info = this.infos[i]

      if (fs.existsSync(file)) {
        let currentContent = editor.getFileContent(file)
        if (info.exists) {
          if (info.content !== currentContent && await this.setFileContentAsync(file, info.content, currentContent) === false) {
            return false
          }
        } else {
          await this.unlinkFileAsync(file, currentContent)
        }
      } else {
        if (info.exists) {
          await this.createFileAsync(file, info.content)
        }
      }

      if (info.exists && info.opened) {
        if (!editor.isOpened(file)) await editor.openFileAsync(file)
      }

      this.debug('回滚文件 %f 成功', file)
      return true
    })

    return result.every(r => r)
  }
}
