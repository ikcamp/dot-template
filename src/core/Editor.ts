import * as fs from 'fs-extra'
import * as path from 'path'
import * as os from 'os'
import * as  error from 'mora-scripts/libs/sys/error'
import {IMinimatchOptions} from './common'
import {Application} from './Application'

export interface IConfiguration {
  debug: boolean
  commandInvalidTimeout: number
  dtplFolderName: string
  minimatchOptions: IMinimatchOptions
  templateExtensions: {
    ejs: string
    dtpl: string
    njk: string
  }
}

export abstract class Editor {
  app: Application
  EOL: string = os.EOL
  configuration: IConfiguration = {
    debug: false,
    commandInvalidTimeout: 60000,
    dtplFolderName: '.dtpl',
    minimatchOptions: {
      matchBase: true,
      nocomment: true,
      dot: true
    },
    templateExtensions: {
      ejs: '.ejs',
      dtpl: '.dtpl',
      njk: '.njk'
    }
  }

  constructor(public rootPath: string) {}

  /**
   * 组件销毁时会被调用
   */
  abstract dispose(): void

  /**
   * 弹出确认框
   */
  abstract confirm(message: string): Promise<boolean>

  getRelativeFilePath(file: string) {
    return path.relative(this.rootPath, file)
  }

  /**
   * 文件是否是 js 文件
   *
   * 如果在 vscode 中可以通过判断 languageId 来准确得到
   *
   * @param {string} file
   */
  isJsFileOrTsFile(file: string): boolean {
    return /\.[jt]sx?$/i.test(file)
  }

  /**
   * 打开文件
   */
  async openFileAsync(file: string): Promise<boolean> {
    return true
  }

  /**
   * 关闭文件
   */
  async closeFileAsync(file: string): Promise<boolean> {
    return true
  }

  /**
   * 设置文件内容
   *
   * @param {string} file
   * @param {string} content
   */
  async setFileContentAsync(file: string, content: string): Promise<boolean> {
    fs.writeFileSync(file, content)
    return true
  }

  /**
   * 同步获取文件的内容
   *
   * @param {string} file
   * @returns
   * @memberof Editor
   */
  getFileContent(file: string) {
    return fs.readFileSync(file).toString()
  }

  /**
   * 判断文件是否打开了
   */
  isOpened(file: string): boolean {
    return false
  }

  debug(message: string) {
    console.log('[dtpl] ' + message)
  }
  info(message: string) {
    console.info('[dtpl] ' + message)
  }
  warning(message: string) {
    console.warn('[dtpl] ' + message)
  }
  error(message: string, e?: any) {
    error(message)
    if (e) console.error(e)
  }
}
