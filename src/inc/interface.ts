export interface IHookParameter {
  /** 当前需要处理的文件路径 */
  filePath: string
  /** filePath 的文件内容，当文件不存在时，内容为 null */
  fileContent: string | null
  /** filePath 相对项目根目录的路径 */
  relativeFilePath: string
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

  /** 插入 reference 的行号 */
  row?: number

  /** 插入 reference 的列号 */
  col?: number

  /**
   * 开个小灶
   *
   * 如果是样式文件的话，指定此字段后，可以智能的将 reference 插入到所有 require 或 import 的最后面
   *
   * 如果当前编辑的文件不是 js/ts 文件，或没有指定 reference，或设置了 row 或 col 时，设置了此字段也不会起作用
   */
  smartInsertStyle?: boolean
}

export type ITemplates = ITemplate[] | {[name: string]: ITemplateProp}

export interface ITemplate extends ITemplateProp {
  /** 模板的名称，需要在同目录下有个和 name 一致的文件 */
  name: string
}
export interface ITemplateProp {
  /**
   * 指定一个模板文件，用于在编辑 .dtpl 文件是可以看到此文件的数据
   *
   * 不需要是实际存在的文件
   */
  sample?: string

  /**
   * 获取关联的文件信息
   *
   * 如果当前编辑的文件不内容时，不会向它注入模板，但可以创建一个关联文件，
   * 这时会调用此函数来获取关联文件的信息
   */
  related?: (data: IData, fileContent: string) => IRelated

  /** 匹配函数或 minimatch 的 pattern */
  matches: string | (() => boolean) | Array<string | (() => boolean)>
}

export interface ILocalData { [key: string]: any }

export interface IConfig {
  getTemplates?(param: IHookParameter): ITemplates
  getLocalData?(template: ITemplate, param: IHookParameter): ILocalData | undefined
}

export type IData = IBasicData | IBasicData & ILocalData
export interface IBasicData {
  rootPath: string
  npmPath: string
  date: string
  time: string
  datetime: string
  user: string
  pkg: {[key: string]: any}

  filePath: string
  relativeFilePath: string
  fileName: string
  fileExt: string

  dirPath: string
  dirName: string

  rawModuleName: string
  moduleName: string
  ModuleName: string
  MODULE_NAME: string
  module_name: string
  ref?: IBasicData | IBasicData & ILocalData
}
