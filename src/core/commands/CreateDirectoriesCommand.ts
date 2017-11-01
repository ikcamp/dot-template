import * as fs from 'fs-extra'
import * as path from 'path'

import {Command, ICommandInitOptions} from './Command'
import {Application} from '../Application'
import {Template} from '../file/'

export class CreateDirectoriesCommand extends Command {
  private templates: Template[]
  constructor(folders: string[], app: Application, options: ICommandInitOptions) {
    super('CreateDirectoriesCommand', app, options)

    let {rootPath} = this.app.editor
    folders = folders
      .map(f => f.trim() ? path.resolve(rootPath, f) : '')
      .filter(f => {
        if (!f || f.indexOf(rootPath) < 0) return false // 文件必须要在项目文件夹内

        // 文件不存在或者目录文件内无其它文件
        return !fs.existsSync(f) || fs.statSync(f).isDirectory() && fs.readdirSync(f).length === 0
      })
      .reduce((all: string[], f) => { // 去重
        if (all.indexOf(f) < 0) all.push(f)
        return all
      }, [])

    let templates: Template[] = []

    folders.forEach(f => {
      let template = this.app.createSource(f).match(true)
      if (template) templates.push(template)
    })

    if (!templates.length) {
      this.invalid = true
    } else {
      this.templates = templates
    }
  }

  async execute(): Promise<boolean> {
    let {app} = this
    let {render, editor} = app

    for (let tpl of this.templates) {
      let fromDir = tpl.filePath
      let toDir = tpl.source.filePath

      let copiedFiles: string[] = []
      let copiedFolders: string[] = []

      this.debug('开始复制目录 %f => %f', fromDir, toDir)
      walk(fromDir, (rawName: string, fromPath: string, stats: fs.Stats) => {
        let relativePath = path.relative(fromDir, fromPath)

        let sourceData = tpl.data
        relativePath = render.removeFileEngineExtension(render.renderDtplContent(relativePath, sourceData))

        let toPath = path.join(toDir, relativePath)
        let name = path.basename(toPath)

        let rawContent = ''
        let content = ''

        if (stats.isFile()) {
          rawContent = editor.getFileContent(fromPath)
          let renderData = app.createSource(toPath).basicData
          renderData.ref = sourceData
          content = render.renderContent(rawContent, renderData, render.judgeEngineByFileExtension(fromPath))
        }

        let filterResult = tpl.filter({fromDir, toDir, fromPath, toPath, rawContent, rawName, name, relativePath, stats, content})

        if (filterResult === false || filterResult == null) return false
        if (typeof filterResult === 'object') {
          if (filterResult.content != null) content = filterResult.content
          if (filterResult.filePath) {
            toPath = path.resolve(editor.rootPath, filterResult.filePath)
          } else if (filterResult.name && name !== filterResult.name) {
            toPath = path.join(path.dirname(toPath), filterResult.name)
          }
        }

        if (fromPath === toPath || toPath.indexOf(fromDir) === 0) return false

        if (stats.isDirectory()) {
          fs.ensureDirSync(toPath)
          copiedFolders.push(toPath)
        } else if (stats.isFile()) {
          this.createFileAsync(toPath, content)
          copiedFiles.push(toPath)
        }
        this.debug('复制文件 %f => %f', fromPath, toPath)
        return true
      })

      tpl.afterFilter(fromDir, toDir, {files: copiedFiles, folders: copiedFolders})
      this.debug('目录复制完成')
    }

    return true
  }

  async rollback(): Promise<boolean> {

    for (let tpl of this.templates) {
      let toDir = tpl.source.filePath
      this.debug('删除目录 %f 的文件', toDir)
      fs.readdirSync(toDir).forEach(f => {
        f = path.join(toDir, f)
        if (fs.statSync(f).isDirectory()) fs.removeSync(f)
        else fs.unlinkSync(f)
      })
    }


    return true
  }

}


function walk(dir: string, fn: (name: string, filePath: string, stats: fs.Stats) => boolean) {
  let names = fs.readdirSync(dir)
  let filePath: string
  let stats: fs.Stats

  for (let name of names) {
    filePath = path.join(dir, name)
    stats = fs.statSync(filePath)
    if (true === fn(name, filePath, stats) && stats.isDirectory()) {
      walk(filePath, fn)
    }
  }
}
