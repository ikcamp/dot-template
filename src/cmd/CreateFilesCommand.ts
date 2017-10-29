import * as fs from 'fs-extra'
// import * as vscode from 'vscode'

import * as _ from '../inc'
import {Command, TextFile, render} from '../lib/'


/**
 * 创建文件并注入模板的命令
 *
 * **注意：**
 *
 * - 文件之前是不存在的
 * - 可以指定多个文件
 *
 * @export
 * @class CreateFilesCommand
 * @extends {Command}
 */
export class CreateFilesCommand extends Command {
  /**
   * 对应文件的创建前的信和，在撤消命令时，要判断内容是否改过了，改过了要弹出确认框
   */
  private infos: Array<{opened: boolean, exists: boolean, newContent: string, content: undefined | string}> = []

  /**
   * @param {string[]} files 所有要创建的文件绝对路径，一定要确保文件不存在
   * @param {boolean} [open] 是否要打开这些创建好的文件
   * @memberof CreateFilesCommand
   */
  constructor(private files: string[], private open?: boolean) {
    super()
  }

  async execute(): Promise<boolean> {
    let result = await _.series(this.files, async (file) => {
      _.log('CreateFilesCommand: 开始创建文件 ' + _.getRelativeFilePath(file))
      let tf = new TextFile(file)
      let dtpl = tf.getDtpl()

      let opened = false
      let content: string | undefined
      let newContent = dtpl ? render(dtpl.templatePath, dtpl.data) : ''
      let exists = fs.existsSync(file)

      if (exists) {
        content = _.getFileContent(file)
        opened = _.isOpened(file)
      } else {
        fs.ensureFileSync(file)
      }

      this.infos.push({content, exists, opened, newContent})

      // 因为是空文件，所以直接写入内容，就不通过 vscode 去写
      if (exists && opened) {
        if (await _.setFileContentAsync(file, newContent) === false) {
          return false
        }
      } else {
        fs.writeFileSync(file, newContent)
        if (this.open) await _.openFile(file)
      }

      _.log('CreateFilesCommand: 文件 ' + _.getRelativeFilePath(file) + ' 创建完成')
      return true
    })

    return result.every(r => r)
  }

  async rollback(): Promise<boolean> {
    let updates: string[] = []
    this.files.forEach((file, i) => {
      let info = this.infos[i]

      if (info.exists && fs.existsSync(file)) { // 过去和现在都存在
        if (_.getFileContent(file) !== info.newContent) {
          updates.push(_.getRelativeFilePath(file))
        }
      }
    })

    if (updates.length && false === await _.confirm(`文件 ${updates.join(', ')} 更新过了，确认要取消创建这些文件吗？`)) {
      return false
    }

   let result = await _.series(this.files, async (file, i) => {
      _.log('CreateFilesCommand: 回滚创建的文件 ' + _.getRelativeFilePath(file))
      let info = this.infos[i]

      if (fs.existsSync(file)) {
        if (info.exists) {
          let currentContent = _.getFileContent(file)
          if (info.content !== currentContent) {
            await _.setFileContentAsync(file, info.content || '')
          }
        } else {
          await _.closeFile(file)
          fs.unlinkSync(file)
        }
      } else {
        if (info.exists) {
          fs.ensureFileSync(file)
          fs.writeFileSync(file, info.content)
        }
      }

      if (info.exists && info.opened) {
        if (!_.isOpened(file)) await _.openFile(file)
      }

      return true
   })
    return result.every(r => r)
  }
}
