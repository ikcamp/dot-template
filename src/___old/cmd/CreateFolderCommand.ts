import {Command, IMatchedDtpl, Source, dtplRender, stripTemplateExtension, render} from '../lib/'
import * as _ from '../inc'
import * as fs from 'fs-extra'
import * as path from 'path'

export class CreateFolderCommand extends Command {
  private fromDir: string
  private toDir: string
  constructor(private dtpl: IMatchedDtpl) {
    super()
    this.fromDir = this.dtpl.templatePath
    this.toDir = this.dtpl.src.filePath
  }

  async execute(): Promise<boolean> {
    let {fromDir, toDir, dtpl} = this
    let data = dtpl.data
    let filter = dtpl.template.filter
    let afterFilter = dtpl.template.afterFilter

    let result: _.ICopyResult = {files: [], folders: []}
    let source: _.ICopySource

    walk(fromDir, (rawName: string, fromPath: string, stats: fs.Stats) => {
      let relativePath = path.relative(fromDir, fromPath)

      relativePath = stripTemplateExtension(dtplRender(relativePath, data))

      let toPath = path.join(toDir, relativePath)
      let name = path.basename(toPath)

      let rawContent = ''
      let content = ''

      if (stats.isFile()) {
        rawContent = _.getFileContent(fromPath)
        let renderData = new Source(toPath).getBasicData()
        renderData.ref = data
        content = render(fromPath, rawContent, renderData)
      }

      source = {fromDir, toDir, fromPath, toPath, rawContent, rawName, name, relativePath, stats, content}

      if (filter) {
        let f = _.runUserFn('template.filter', filter, [source], dtpl.template)

        if (f === false || f == null) return false

        if (typeof f === 'object') {
          if (f.content != null) content = f.content
          if (f.filePath) {
            toPath = f.filePath
          } else if (f.name && name !== f.name) {
            toPath = path.join(path.dirname(toPath), f.name)
          }
        }
      }

      if (fromPath === toPath || toPath.indexOf(fromDir) === 0) return false

      if (stats.isDirectory()) {
        fs.ensureDirSync(toPath)
        result.folders.push(toPath)
      } else if (stats.isFile()) {
        fs.ensureDirSync(path.dirname(toPath))
        fs.writeFileSync(toPath, content)
        result.files.push(toPath)
      }

      return true
    })

    if (afterFilter) _.runUserFn('template.afterFilter', afterFilter, [fromDir, toDir, result], dtpl.template)
    return true
  }

  async rollback(): Promise<boolean> {
    let {toDir} = this
    fs.readdirSync(toDir).forEach(f => {
      f = path.join(toDir, f)
      let stats = fs.statSync(f)
      if (stats.isDirectory()) fs.removeSync(f)
      else fs.unlinkSync(f)
    })
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
