import * as fs from 'fs-extra'
import * as path from 'path'
import * as minimatch from 'minimatch'
import * as DotProp from 'mora-scripts/libs/lang/DotProp'

import * as _ from './inc/'

export interface IMatchedDtpl {
  /** 当前匹配到的 .dtpl 的目录 */
  folder: string
  /** 当前匹配到的模板文件路径 */
  templatePath: string
  /** .dtpl 的目录中的 config 文件返回的对象 */
  config: _.IConfig
  /** config 中配置的模板对象 */
  template: _.ITemplate
  /** 渲染模板用的数据 */
  data: _.IData
}

const TPL_VARABLE_REGEXP = /\$([a-zA-Z][\-\w]*)|\$\{([a-zA-Z][\-\w\.]*)\}/g

export class TextFile {
  /**
   * 文件的绝对路径，注意：此路径上可能并没有文件
   */
  filepath: string
  /**
   * 文件相对于项目根目录的路径，不带 "./" 前缀
   */
  relative: string
  constructor(filepath: string) {
    this.filepath = path.resolve(filepath)
    this.relative = path.relative(_.rootPath, filepath)
  }

  /** 文件是否存在 */
  get exists(): boolean {
    return fs.existsSync(this.filepath)
  }

  /** 当前文件内容，注意：文件不一定存在 */
  get content(): string {
    return _.getFileContent(this.filepath)
  }

  /** 文件是否为空：包括文件不存在，或者文件内容 trim 后为空字符串 */
  get empty(): boolean {
    return this.exists && this.content.trim() === ''
  }

  /**
   * 获取模板 和 渲染的信息
   */
  getDtpl(refFile?: string | null): IMatchedDtpl | null {
    try {
      let dtpl = this.findNearestMatchedDtpl()
      if (!dtpl) return null
      if (refFile) dtpl.data.ref = this.getRefData(refFile)
      return dtpl
    } catch (e) {
      console.error(`dtpl 在执行 getDtpl 函数时报错`)
      console.error(e)
      return null
    }
  }

  /**
   * 获取渲染数据
   */
  getData(refFile?: string | null): _.IData {
    let dtpl = this.getDtpl(refFile)
    if (dtpl) return dtpl.data
    let data = this.getBasicData()
    return refFile ? {...data, ref: this.getRefData(refFile)} : data
  }

  /**
   * 获取关联的文件的 data
   */
  private getRefData(refFile: string): _.IData {
    let f = new TextFile(refFile)
    let dtpl = f.findNearestMatchedDtpl()
    return dtpl ? dtpl.data : f.getBasicData()
  }

  /**
   * 找到最近的匹配的 dtpl 目录及相关配置和模板及模板数据，可能返回 null
   */
  private findNearestMatchedDtpl(): IMatchedDtpl | null {
    let {dtplFolderName} = _.config
    let dtplFolders = this.findAllDirectoriesCanExistsDtplFolder(this.filepath).map(f => path.join(f, dtplFolderName))

    dtplFolders.push(path.join(_.dtplRootPath, 'res', '.dtpl')) // dtpl 一定会使用的 .dtpl 目录

    let hookParameter = this.getHookParameter(this.filepath)
    for (let dtplFolder of dtplFolders) {
      if (fs.existsSync(dtplFolder)) {
        let configFile = this.findConfigFileInDtplFolder(dtplFolder)
        let config = configFile ? this.loadDtplConfigFile(configFile) : null
        if (config) {
          let template = this.getMatchedTemplate(dtplFolder, hookParameter, config)

          if (template) {
            let basicData = this.getBasicData()
            let locals = config.getLocalData ? config.getLocalData(template, hookParameter) : null
            if (!locals && typeof locals !== 'object') locals = {}
            const templatePath = path.join(dtplFolder, template.name)
            _.log(`找到匹配的模板文件 ${templatePath}`)
            return {template, config, folder: dtplFolder, templatePath, data: {...basicData, ...locals}}
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
  getBasicData(): _.IBasicData {
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
    let filePath = this.filepath
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
   * 渲染模板，返回渲染后的文件内容
   */
  render(templateFile: string, data: {[key: string]: any}): string {
    let exts = _.config.renderExtensions
    let content = _.getFileContent(templateFile)

    if (templateFile.endsWith(exts.ejs)) {

    } else if (templateFile.endsWith(exts.dtpl)) {
      return content.replace(TPL_VARABLE_REGEXP, (_, key1, key2) => {
        let key = key1 || key2
        if (key in data) return data[key]
        if (key.indexOf('.') > 0 && DotProp.has(data, key)) return DotProp.get(data, key)
        return ''
      })

    } else if (templateFile.endsWith(exts.njk)) {

    }

    return content
  }

  /**
   * 根据用户的配置，查找一个匹配的并且存在的模板文件
   */
  private getMatchedTemplate(dtplFolder: string, param: _.IHookParameter, config: _.IConfig): _.ITemplate | undefined {
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

        if (result && !fs.existsSync(path.join(dtplFolder, t.name))) {
          _.warning(`匹配到的模板文件 ${path.join(dtplFolder, t.name)} 不存在，已忽略`)
          result = false
        }

        return result
      })
    })
  }

  /**
   * 生成调用 config.getTemplates 和 config.getLocalData 函数的参数
   */
  private getHookParameter(filePath: string): _.IHookParameter {
    return {
      filePath,
      fileContent: fs.existsSync(filePath) ? _.getFileContent(filePath) : null,
      relativeFilePath: path.relative(_.rootPath, filePath)
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
      if (fs.existsSync(f)) {
        result = f
        break
      }
    }

    if (!result) {
      _.warning(`dtpl 目录 ${dtplFolder} 里没有配置文件`)
    }

    return result
  }

  /**
   * 根据提供的文件，向上查找到所有可能有存放 .dtpl 文件夹的目录
   */
  private findAllDirectoriesCanExistsDtplFolder(file: string): string[] {
    let result = []

    let dir = path.dirname(file)
    result.push(dir)

    while (dir !== path.resolve(dir, '..')) {
      dir = path.resolve(dir, '..')
      result.push(dir)
    }

    if (process.env.HOME && result.indexOf(process.env.HOME) < 0) result.push(process.env.HOME)
    return result
  }
}
