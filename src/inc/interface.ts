import {Stats} from 'fs'

export interface IObject { [key: string]: any }
export interface ISource {
  /**
   * 当前处理的文件的绝对路径（注意：包括文件夹！）
   *
   * @type {string}
   */
  filePath: string

  /**
   * filePath 相对项目根目录的路径
   *
   * @type {string}
   */
  relativeFilePath: string

  /**
   * 文件是否存在
   *
   * 在创建新文件的时候，文件是有可能不存在的
   *
   * @type {boolean}
   */
  exists: boolean
  /**
   * filePath 所指定的路径是一个文件
   *
   * @type {boolean}
   */
  isFile: boolean
  /**
   * filePath 所指定的路径是一个目录
   *
   * @type {boolean}
   */
  isDirectory: boolean
  /**
   * filePath 的文件内容
   *
   * 当路径不存在，或路径为文件夹是，此字段为空字符串
   *
   * @type {string}
   */
  fileContent: string

  /**
   * 部分在 vscode 中配置的的关于 dot-template 的信息
   */
  configuration: {
    dtplFolderName: string
    dtplExtension: string
    ejsExtension: string
    njkExtension: string
  }
}

/**
 * 复制文件夹模板中的每一个文件时生成的一个关于此文件的对象
 *
 * template 中的 filter 函数接收的参数
 *
 * @export
 * @interface ICopySource
 */
export interface ICopySource {
  /** 复制源文件夹 */
  fromDir: string
  /** 复制的目标文件夹 */
  toDir: string

  /** 当前复制的文件的绝对路径（注意也有可能是个文件夹） */
  fromPath: string

  /** 目标路径 */
  toPath: string

  /** 文件的原始名称 */
  rawName: string
  /** 文件原始内容；如果是文件夹时，此字段为空字符串 */
  rawContent: string

  /** 文件的新名称，文件名中可能会带 ${moduleName} 等这些 IData 中的变量，它们会被 dtpl-render 给替换了，此名字是替换后的名字 */
  name: string

  /** 文件的新路径，相对于 fromDir 的路径， 文件路径中可能会带 ${moduleName} 等这些 IData 中的变量，它们会被 dtpl-render 给替换了，此路径是替换后的名字 */
  relativePath: string

  /** 文件用模板引擎渲染之后的新内容；如果是文件夹时，此字段为空字符串 */
  content: string

  /** 复制的文件的 stats 对象 */
  stats: Stats
}

/**
 *
 */
export interface ICopyFilterResult {
  /**
   * 返回一个新的文件的绝对路径
   *
   * filePath 和 name 只需要设置一个就行了，都设置会优先使用 filePath
   */
  filePath?: string
  /**
   * 返回一个新的名字
   *
   * filePath 和 name 只需要设置一个就行了，都设置会优先使用 filePath
   */
  name?: string

  /**
   * 新的文件内容（文件夹时此字段无效）
   */
  content?: string
}

/**
 * 复制文件夹模板后，生成的所有复制的文件路径和文件夹路径
 *
 * template 中 afterFilter 函数接收的参数
 *
 */
export interface ICopyResult {
  files: string[]
  folders: string[]
}

/**
 * 标识要生成的新文件的路径 和 要插入引用的位置及引用内容
 *
 * template 中的 related 函数返回的对象
 */
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
   * 还拿上面例子来说，当生成了一个同名的 css 文件后，你可能需要在 src/Home.ts 中的第三行插入
   * 一行 "require('./style/Home.css')" 来引用它，这时就可以指定
   *
   * ```
   *  {
   *    relativePath: './style/Home.css'
   *    reference: '\nrequire("./style/Home.css")\n' // 前后加换行符
   *    begin: {x: 3, y: 0}
   *  }
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
   * 插入 reference 结束坐标
   *
   * - 如果不设置 end，则默认和 from 一样，即完全会插入 reference 在 begin 坐标
   * - 如果设置了 end，则 begin - end 之间的数据全会被 reference 替换了
   */
  end?: {x: number, y?: number}

  /**
   * 在 js/ts 文件中自动在合适的地方插入样式文件的引用（这是特殊功能，谁要作者是前端呢，给自己开个小灶）
   *
   * 如果是样式文件的话，指定此字段后，可以智能的将 reference 插入到所有 require 或 import 的最后面
   *
   * 如果当前编辑的文件不是 js/ts 文件，或没有指定 reference，或设置了 begin 或 end 时，设置了此字段也不会起作用
   */
  smartInsertStyle?: boolean
}

/** 内部使用的一个对象，系统会根据 IRelated 对象来计算出要创建的关联文件的真实路径 */
export interface IExtendRelated extends IRelated {
  /**
   * 关联文件的绝对路径
   */
  filePath: string
}

export type ITemplates = ITemplate[] | {[name: string]: ITemplateProp}

export interface ITemplate extends ITemplateProp {
  /**
   *  模板的名称，需要在同目录下有个和 name 一致的文件
   */
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
   * 在复制文件夹模板里的文件时，可以过滤掉一些不要复制的文件，或者修改要生成的新文件的路径及内容
   */
  filter?: (source: ICopySource) => boolean | ICopyFilterResult

  /**
   * 过滤完后，并且文件都已复制完成后会执行此函数
   *
   * 可以用它来创建一些新文件，或者删除一些文件，总之任何 node 可以做的事你都可以在这里尝试
   */
  afterFilter?: (fromDir: string, toDir: string, result: ICopyResult) => void

  /**
   * 获取关联的文件信息
   *
   * 如果当前编辑的文件有内容时，createTemplateFile 命令不会向它注入模板
   * 但如果配置此函数，可以给当前文件插入代码，并创建一个关联的文件。比如：
   *
   * 正在编辑文件 src/page/Home.js 文件，你可能希望快速创建 src/page/styles/Home.css 文件和它关联，
   * 并且将引用 "require('./styles/Home.css')" 插入到 src/Home.js 中，这时可以配置此
   * 函数，并返回
   *
   * ```
   *  {
   *    relativePath: './styles/Home.css',  // 前面带 "./" 表示相对于当前编辑文件的目录
   *    reference: `require('./styles/Home.css')`,
   *
   *    // 这个配置选项是专门给此情况时使用（算是开小灶吧），表示自动插入到当前文件的合适的地方
   *    // 如果是其它情况，你需要指定 begin坐标 或 begin和end坐标 （同时有 begin 和 end 时表示会替换这部分的内容）
   *    smartInsertStyle: true
   *  }
   * ```
   *
   * 另一种情况是，你需要创建一个和 src/page/Home.js 同名的测试文件放在项目最外层的 test 文件下，你可以这样返回
   *
   * ```
   *   {
   *      relativePath: 'test/Home.js'      // 前面不带 "./" 表示是相对于项目根目录
   *   }
   * ```
   *
   */
  related?: (data: IData, fileContent: string) => IRelated | IRelated[]

  // onRender?: (content: string) => string

  /**
   * 匹配函数或 minimatch 的 pattern
   */
  matches: string | (() => boolean) | Array<string | ((minimatch: IMinimatchFunction) => boolean)>

  /**
   * 是否使用 minimatch 去匹配 matches 中的字符串
   *
   * 默认值为系统配置中的 `dot-template.minimatchOptions`
   *
   * - true：  使用 minimatch 默认的参数
   * - false:  不使用 minimatch 完全使用字符串
   * - {}:     为对象时，可以指定 minimatch 的选项
   *
   * @type {(boolean | IMinimatchOptions)}
   * @memberof ITemplateProp
   */
  minimatch?: boolean | IMinimatchOptions
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

export interface IMinimatchOptions {
  /**
   * Dump a ton of stuff to stderr.
   *
   * @default false
   */
  debug?: boolean;

  /**
   * Do not expand {a,b} and {1..3} brace sets.
   *
   * @default false
   */
  nobrace?: boolean;

  /**
   * Disable ** matching against multiple folder names.
   *
   * @default false
   */
  noglobstar?: boolean;

  /**
   * Allow patterns to match filenames starting with a period,
   * even if the pattern does not explicitly have a period in that spot.
   *
   * @default false
   */
  dot?: boolean;

  /**
   * Disable "extglob" style patterns like +(a|b).
   *
   * @default false
   */
  noext?: boolean;

  /**
   * Perform a case-insensitive match.
   *
   * @default false
   */
  nocase?: boolean;

  /**
   * When a match is not found by minimatch.match,
   * return a list containing the pattern itself if this option is set.
   * Otherwise, an empty list is returned if there are no matches.
   *
   * @default false
   */
  nonull?: boolean;

  /**
   * If set, then patterns without slashes will be matched against
   * the basename of the path if it contains slashes.
   *
   * @default false
   */
  matchBase?: boolean;

  /**
   * Suppress the behavior of treating #
   * at the start of a pattern as a comment.
   *
   * @default false
   */
  nocomment?: boolean;

  /**
   * Suppress the behavior of treating a leading ! character as negation.
   *
   * @default false
   */
  nonegate?: boolean;

  /**
   * Returns from negate expressions the same as if they were not negated.
   * (Ie, true on a hit, false on a miss.)
   *
   * @default false
   */
  flipNegate?: boolean;
}
export type IMinimatchFunction = (target: string, pattern: string, options?: IMinimatchOptions) => boolean
