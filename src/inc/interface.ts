export interface ISource {
  /** 当前需要处理的文件路径 */
  filePath: string
  /** filePath 所指定的路径是否存在 */
  exists: boolean
  /** filePath 所指定的路径是一个文件 */
  isFile: boolean
  /** filePath 所指定的路径是一个目录 */
  isDirectory: boolean
  /** filePath 的文件内容，当文件不存在时，内容为 null */
  fileContent: string | null
  /** filePath 相对项目根目录的路径 */
  relativeFilePath: string

  /** 相关 dot-template 配置信息 */
  configuration: {
    dtplFolderName: string
    dtplExtension: string
    ejsExtension: string
    njkExtension: string
  }
}

export interface IRelated {
  /**
   * 相对于当前编辑的文件的一个相对路径
   *
   * dot-template 会根据这个相对路径来创建一个新的文件，举例来说：
   *
   * 假设当前文件是 src/Home.ts
   *
   * 可能需要一个同名的 css 文件放在同目录下的 style 文件夹内，这时你可以将 relativePath 设置成 './style/Home.css'
   *
   * 也有可能需要一个同名的测试文件放在根目录下的 test 文件夹内，这时你可以将 relativePath 设置成 'test/Home.ts'
   */
  relativePath: string

  /**
   * 生成了一个关联文件后，当前编辑的文件中可能需要插入一行来引用关联的文件
   *
   *
   * 还拿上面例子来说，当生成了一个同名的 css 文件后，你可能需要在 src/Home.ts 中的最上面插入
   * 一行 "require('./style/Home.css')" 来引用它，这时就可以指定
   *
   * ```
   *  reference='./style/Home.css'
   *  row=0
   *  col=0
   * ```
   *
   * 表示自动在当前编辑的文件的第 row 行插入 reference 指定的字符串
   */
  reference?: string | undefined

  /**
   * 插入 reference 起始坐标
   *
   * 如果没设置 from，则默认为 {x: 0, y: 0}
   *
   */
  begin?: {x: number, y?: number}

  /**
   * 插入 reference 结束坐标 (包含结束点)
   *
   * 如果不设置 end，则默认和 from 一样
   */
  end?: {x: number, y?: number}

  /**
   * 开个小灶
   *
   * 如果是样式文件的话，指定此字段后，可以智能的将 reference 插入到所有 require 或 import 的最后面
   *
   * 如果当前编辑的文件不是 js/ts 文件，或没有指定 reference，或设置了 begin 或 end 时，设置了此字段也不会起作用
   */
  smartInsertStyle?: boolean
}

export interface IExtendRelated extends IRelated {
  /**
   * 关联文件的绝对路径
   */
  filePath: string
}

export type ITemplates = ITemplate[] | {[name: string]: ITemplateProp}

export interface ITemplate extends ITemplateProp {
  /** 模板的名称，需要在同目录下有个和 name 一致的文件 */
  name: string
}
export interface ITemplatePropFilterReturns {
  /**
   * 返回一个相对模板目录的新的文件路径
   */
  rename?: string

  /**
   * 新的文件内容（文件夹时此字段无效）
   */
  content?: string
}
export interface ITemplatePropFilter {
  /**
   * 过滤目录模板中的文件（TODO: 换成对象，加上 stats）
   *
   * @param {string} name - 文件名称
   * @param {string} relativeFilePath - 相对模板目录的文件路径
   * @param {string} absoluteFilePath - 绝对路径
   * @returns {(boolean | ITemplatePropFilterReturns)}
   */
  (name: string, relativeFilePath: string, absoluteFilePath: string): boolean | ITemplatePropFilterReturns
}
export interface ITemplateProp {
  /**
   * 指定一个模板文件，用于在编辑 .dtpl 文件是可以看到此文件的数据
   *
   * 不需要是实际存在的文件
   */
  sample?: string

  filter?: ITemplatePropFilter
  afterFilter?: (fromDir: string, toDir: string, created: {files: string[], folders: string[]}) => void


  /**
   * 获取关联的文件信息
   *
   * 如果当前编辑的文件没内容时，不会向它注入模板，但可以创建一个关联文件，
   * 这时会调用此函数来获取关联文件的信息
   */
  related?: (data: IData, fileContent: string) => IRelated | IRelated[]

  // onRender?: (content: string) => string

  /** 匹配函数或 minimatch 的 pattern */
  matches: string | (() => boolean) | Array<string | (() => boolean)>
}

export interface ILocalData { [key: string]: any }

export interface IConfig {
  getTemplates?(param: ISource): ITemplates
  getLocalData?(template: ITemplate, param: ISource): ILocalData | undefined
}

export type IData = IBasicData | IBasicData & ILocalData

export interface IBasicData {
  /*# INJECT_START basicData #*/
  /**
   * 项目根目录路径
   * @type {string}
   */
  rootPath: string
  /**
   * node_modules 目录路径
   * @type {string}
   */
  npmPath: string
  /**
   * 当前日期
   * @type {string}
   */
  date: string
  /**
   * 当前时间
   * @type {string}
   */
  time: string
  /**
   * 当前日期与时间
   * @type {string}
   */
  datetime: string
  /**
   * 系统用户，读取环境变量中的 HOME
   * @type {string}
   */
  user: string
  /**
   * 项目根目录上的 package.json 文件的内容
   * @type {{[key: string]: any}}
   */
  pkg: {[key: string]: any}
  /**
   * 当前文件的绝对路径
   * @type {string}
   */
  filePath: string
  /**
   * 当前文件相对根目录的路径
   * @type {string}
   */
  relativeFilePath: string
  /**
   * 当前文件的名称，不带路径和后缀
   * @type {string}
   */
  fileName: string
  /**
   * 当前文件的后缀
   * @type {string}
   */
  fileExt: string
  /**
   * 当前文件的目录的绝对路径
   * @type {string}
   */
  dirPath: string
  /**
   * 当前文件的目录的名称
   * @type {string}
   */
  dirName: string
  /**
   * 和 fileName 一致
   * @type {string}
   */
  rawModuleName: string
  /**
   * fileName 的驼峰形式
   * @type {string}
   */
  moduleName: string
  /**
   * fileName 中的每个单词首字母都大写
   * @type {string}
   */
  ModuleName: string
  /**
   * fileName 中所有字母都大写，并用下划线连接
   * @type {string}
   */
  MODULE_NAME: string
  /**
   * fileName 中所有字母都小写，并用下划线连接
   * @type {string}
   */
  module_name: string
  /**
   * 创建 related 文件时，原文件的 data 对象
   * @type {IData}
   */
  ref?: IData
  /*# INJECT_END #*/
}
