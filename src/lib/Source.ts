import * as fs from 'fs-extra'
import * as path from 'path'
import * as minimatch from 'minimatch'

import * as _ from '../inc/'

export interface IMatchedDtpl {
  /** 当前匹配到的 .dtpl 的目录 */
  folder: string

  /** 源文件相关的数据 */
  src: _.ISource

  /** 当前匹配到的模板文件或模板目录的绝对路径 */
  templatePath: string

  /** .dtpl 的目录中的 dtpl.ts 或 dtpl.js 文件返回的对象 */
  config: _.IConfig

  /** 匹配到的用户定义的模板对象 */
  template: _.ITemplate

  /** 渲染模板用的数据 */
  data: _.IData
}

export class Source {
  /**
   * 文件的绝对路径
   *
   * 注意：此路径上可能并没有文件，也可能是一个文件夹
   */
  filePath: string

  /**
   * 文件相对于项目根目录的路径，不带 "./" 前缀
   */
  relative: string

  /**
   * Creates an instance of Source.
   * @param {string} filePath - 文件或文件夹的绝对路径
   * @memberof Source
   */
  constructor(filePath: string) {
    this.filePath = path.resolve(filePath)
    this.relative = path.relative(_.rootPath, filePath)
  }

  /**
   * 获取模板 和 渲染的信息
   */
  getDtpl(isDirectoryTemplate: boolean = false): IMatchedDtpl | null {
    try {
      let dtpl = this.findNearestMatchedDtpl(isDirectoryTemplate)
      if (!dtpl) return null
      return dtpl
    } catch (e) {
      _.error(e)
      return null
    }
  }

  /**
   * 获取渲染数据
   */
  getData(): _.IData {
    let dtpl = this.getDtpl()
    return dtpl ? dtpl.data : this.getBasicData()
  }

  /**
   * 找到最近的匹配的 dtpl 目录及相关配置和模板及模板数据，可能返回 null
   */
  private findNearestMatchedDtpl(isDirectoryTemplate: boolean): IMatchedDtpl | null {
    let {dtplFolderName} = _.config
    let dtplFolders = this.findAllDirectoriesCanExistsDtplFolder().map(f => path.join(f, dtplFolderName))

    // 如果刚创建的文件夹正好就是 .dtpl 目录
    // 则不应该在它下面找配置信息，要忽略它
    if (isDirectoryTemplate && path.basename(this.filePath) === _.config.dtplFolderName) {
      dtplFolders = dtplFolders.filter(f => f !== this.filePath)
    }

    dtplFolders.push(path.join(_.dtplRootPath, 'res', '.dtpl')) // dtpl 一定会使用的 .dtpl 目录

    let sourceParameter = this.getSourceParameter()
    for (let dtplFolder of dtplFolders) {
      if (fs.existsSync(dtplFolder)) {
        let configFile = this.findConfigFileInDtplFolder(dtplFolder)
        let config = configFile ? this.loadDtplConfigFile(configFile) : null
        if (config) {
          let template = this.getMatchedTemplate(dtplFolder, isDirectoryTemplate, sourceParameter, config)

          if (template) {
            let basicData = this.getBasicData()
            let locals = config.getLocalData ? config.getLocalData(template, sourceParameter) : null
            if (!locals && typeof locals !== 'object') locals = {}
            const templatePath = path.join(dtplFolder, template.name)
            _.log(`找到匹配的模板 ${templatePath}`)
            return {template, config, src: sourceParameter, folder: dtplFolder, templatePath, data: {...basicData, ...locals}}
          }
        }
      }
    }

    _.log(`没有找到和文件 ${this.relative} 匹配的模板文件`)
    return null
  }

  /**
   * 获取渲染模板用的基本数据
   */
  private getBasicData(): _.IBasicData {
    let d = new Date()
    let pad = (n: number): number | string => n < 10 ? '0' + n : n
    let date = [d.getFullYear(), d.getMonth() + 1, d.getDate()].map(pad).join('-')
    let time = [d.getHours(), d.getMinutes()].map(pad).join(':')
    let datetime = date + ' ' + time

    let rootPath = _.rootPath
    let npmPath = path.join(rootPath, 'node_modules')

    let pkg = {}
    try { pkg = require(path.join(rootPath, 'package.json')) } catch (e) { }

    let relativeFilePath = this.relative
    let filePath = this.filePath
    let dirPath = path.dirname(filePath)
    let fileExt = path.extname(filePath)
    let fileName = path.basename(filePath, fileExt)
    let dirName = path.basename(dirPath)

    return {
      date, time, datetime,

      user: process.env.USER,
      pkg,

      rootPath, npmPath,
      filePath, dirPath,
      fileName, dirName,
      fileExt, relativeFilePath,

      rawModuleName: fileName,
      moduleName: _.transformer.camel(fileName),
      ModuleName: _.transformer.capitalize(fileName),
      MODULE_NAME: _.transformer.upper(fileName),
      module_name: _.transformer.snake(fileName)
    }
  }

  /**
   * 根据用户的配置，查找一个匹配的并且存在的模板文件
   */
  private getMatchedTemplate(dtplFolder: string, isDirectoryTemplate: boolean, param: _.ISource, config: _.IConfig): _.ITemplate | undefined {
    if (!config.getTemplates) {
      _.warning('dtpl 的配置文件需要导出 getTemplates 函数')
      return
    }

    let minimatchOpts = _.config.minimatchOptions

    let ts = config.getTemplates(param) || []
    let templates = Array.isArray(ts) ? ts : Object.keys(ts).map((name: string) => ({name, ...(ts as {[key: string]: _.ITemplateProp})[name]}))

    return templates.find(t => {
      let matches = Array.isArray(t.matches) ? t.matches : [t.matches]
      return !!matches.find(m => {
        let result: boolean = false
        if (typeof m === 'string') {
          result = minimatch(param.relativeFilePath, m, minimatchOpts)
        } else if (typeof m === 'function') {
          result = m()
        }

        if (result) {
          let templatePath = path.join(dtplFolder, t.name)
          if (!fs.existsSync(templatePath)) {
            _.warning(`匹配到的模板文件 ${templatePath} 不存在，已忽略`)
            result = false
          }
          let stats = fs.statSync(templatePath)
          if (stats.isFile() && isDirectoryTemplate || stats.isDirectory() && !isDirectoryTemplate) {
            result = false
          }
        }

        return result
      })
    })
  }

  /**
   * 生成调用 config.getTemplates 和 config.getLocalData 函数的参数
   */
  private getSourceParameter(): _.ISource {
    let filePath = this.filePath
    let stats: fs.Stats | undefined
    let {ejs, njk, dtpl} = _.config.renderExtensions
    try {
      stats = fs.statSync(filePath)
    } catch (e) {}
    return {
      filePath,
      exists: !!stats,
      isFile: stats ? stats.isFile() : false,
      isDirectory: stats ? stats.isDirectory() : false,
      fileContent: stats && stats.isFile() ? _.getFileContent(filePath) : null,
      relativeFilePath: this.relative,
      configuration: {
        dtplFolderName: _.config.dtplFolderName,
        dtplExtension: dtpl,
        njkExtension: njk,
        ejsExtension: ejs
      }
    }
  }

  /**
   * 加载配置文件，每次都重新加载，确保无缓存
   */
  private loadDtplConfigFile(configFile: string): _.IConfig {
    if (configFile.endsWith('.ts')) _.enableRequireTsFile()
    delete require.cache[require.resolve(configFile)]
    return require(configFile)
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
      _.warning(`目录 ${dtplFolder} 里没有配置文件`)
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
