import * as path from 'path'
import * as minimatch from 'minimatch'
import * as fs from 'fs-extra'
import {Template} from './Template'
import {Application} from '../Application'
import {enableRequireTsFile, transformer, IBasicData, IData, IDtplConfig, IUserTemplate} from '../common'

export class Source {
  private _basicData: IBasicData

  relativeFilePath: string
  exists: boolean
  stats: fs.Stats | undefined
  isFile: boolean
  isDirectory: boolean
  fileContent: string

  constructor(public app: Application, public filePath: string) {
    let stats: fs.Stats | undefined
    try {
      stats = fs.statSync(filePath)
    } catch (e) {}

    this.exists = !!stats
    this.isFile = stats ? stats.isFile() : false
    this.isDirectory = stats ? stats.isDirectory() : false
    this.fileContent = this.isFile ? this.app.editor.getFileContent(filePath) : ''
    this.relativeFilePath = path.relative(this.app.rootPath, this.filePath)
  }

  get basicData(): IBasicData {
    if (!this._basicData) {
      let d = new Date()
      let pad = (n: number): number | string => n < 10 ? '0' + n : n
      let date = [d.getFullYear(), d.getMonth() + 1, d.getDate()].map(pad).join('-')
      let time = [d.getHours(), d.getMinutes()].map(pad).join(':')
      let datetime = date + ' ' + time

      let rootPath = this.app.rootPath
      let npmPath = path.join(rootPath, 'node_modules')

      let pkg = {}
      try { pkg = require(path.join(rootPath, 'package.json')) } catch (e) { }

      let {filePath, relativeFilePath} = this
      let dirPath = path.dirname(filePath)
      let fileExt = path.extname(filePath)
      let fileName = path.basename(filePath, fileExt)
      let dirName = path.basename(dirPath)

      this._basicData =  {
        date,
        time,
        datetime,

        user: process.env.USER,
        pkg,

        rootPath,
        npmPath,
        filePath,
        dirPath,
        fileName,
        dirName,
        fileExt,
        relativeFilePath,

        rawModuleName: fileName,
        moduleName: transformer.camel(fileName),
        ModuleName: transformer.capitalize(fileName),
        MODULE_NAME: transformer.upper(fileName),
        module_name: transformer.snake(fileName)
      }
    }
    return this._basicData
  }

  createTemplate(filePath: string, data: IData, userTemplate: IUserTemplate) {
    return new Template(this, filePath, data, userTemplate)
  }

  match(isTemplateDirectory: boolean): Template | undefined {
    let {dtplFolderName} = this.app.editor.configuration
    let dtplFolders = this.findAllDirectoriesCanExistsDtplFolder().map(f => path.join(f, dtplFolderName))

    // 如果刚创建的文件夹正好就是 .dtpl 目录
    // 则不应该在它下面找配置信息，要忽略它
    if (isTemplateDirectory && path.basename(this.filePath) === dtplFolderName) {
      dtplFolders = dtplFolders.filter(f => f.indexOf(this.filePath) !== 0)
    }

    dtplFolders.push(path.join(this.app.dotTemplateRootPath, 'res', '.dtpl')) // dtpl 一定会使用的 .dtpl 目录

    for (let dtplFolder of dtplFolders) {
      if (fs.existsSync(dtplFolder)) {
        let configFile = this.findConfigFileInDtplFolder(dtplFolder)
        let config = configFile ? this.loadDtplConfig(configFile) : null
        if (config) {
          let userTemplate = this.findMatchedUserTemplate(dtplFolder, isTemplateDirectory, config)

          if (userTemplate) {
            const templatePath = path.resolve(dtplFolder, userTemplate.name)
            this.app.debug(`找到匹配的模板 %f`, templatePath)

            return this.createTemplate(templatePath, {...this.basicData, ...(config.globalData || {}), ...(userTemplate.data || {})}, userTemplate)
          }
        }
      }
    }

    this.app.debug(`没有找到和文件 %f 匹配的模板文件`, this.filePath)
    return
  }

  /**
   * 根据用户的配置，查找一个匹配的并且存在的模板文件
   */
  private findMatchedUserTemplate(dtplFolder: string, isTemplateDirectory: boolean, config: IDtplConfig): IUserTemplate | undefined {
    let defaultMinimatchOptions = this.app.editor.configuration.minimatchOptions

    return config.templates.find(t => {
      let matches = Array.isArray(t.matches) ? t.matches : [t.matches]
      return !!matches.find(m => {
        let result: boolean = false
        if (typeof m === 'string') {
          if (t.minimatch === false) {
            result = this.relativeFilePath === m
          } else {
            result = minimatch(this.relativeFilePath, m, typeof t.minimatch !== 'object' ? defaultMinimatchOptions : t.minimatch)
          }
        } else if (typeof m === 'function') {
          result = !!this.app.runUserFunction('template.match', m, [minimatch, this], t)
        }

        if (result) {
          let templatePath = path.resolve(dtplFolder, t.name)
          if (!fs.existsSync(templatePath)) {
            this.app.warning(`匹配到的模板文件 %f 不存在，已忽略`, templatePath)
            result = false
          } else {
            let stats = fs.statSync(templatePath)
            if (stats.isFile() && isTemplateDirectory || stats.isDirectory() && !isTemplateDirectory) {
              result = false
            }
          }
        }
        return result
      })
    })
  }

  /**
   * 加载配置文件，每次都重新加载，确保无缓存
   */
  private loadDtplConfig(configFile: string): IDtplConfig | undefined {
    if (configFile.endsWith('.ts')) enableRequireTsFile()
    delete require.cache[require.resolve(configFile)]
    let mod: any = require(configFile)
    let config: IDtplConfig | undefined
    if (mod) {
      let fn = typeof mod.default === 'function' ? mod.default : mod
      if (typeof fn === 'function') config = this.app.runUserFunction('dtpl config', fn, [this])
    }

    if (config && (!config.templates || !Array.isArray(config.templates))) {
      this.app.warning(`配置文件 %f 没有返回 templates 数组`, configFile)
    }
    return config
  }

  /**
   * 在 dtpl 目录内找到配置文件
   */
  private findConfigFileInDtplFolder(dtplFolder: string): string | undefined {
    let result: string | undefined
    let names = ['dtpl.js', 'dtpl.ts']

    for (let n of names) {
      let f = path.join(dtplFolder, n)
      if (fs.existsSync(f) && fs.statSync(f).isFile()) {
        result = f
        break
      }
    }

    if (!result) {
      this.app.warning(`目录 %f 里没有配置文件`, dtplFolder)
    }

    return result
  }

  /**
   * 根据提供的文件，向上查找到所有可能有存放 .dtpl 文件夹的目录
   */
  private findAllDirectoriesCanExistsDtplFolder(): string[] {
    let result = []

    let dir = this.filePath // 不用管它是文件还是文件夹
    result.push(dir)

    while (dir !== path.resolve(dir, '..')) {
      dir = path.resolve(dir, '..')
      result.push(dir)
    }

    if (process.env.HOME && result.indexOf(process.env.HOME) < 0) result.push(process.env.HOME)
    return result
  }
}
