import * as Events from 'mora-scripts/libs/lang/Events'
import * as fs from 'fs-extra'
import * as path from 'path'
import {Editor} from './Editor'
import {Commander} from './Commander'
import {Render} from './Render'
import {Source} from './file/'

export class Application {
  private event: Events
  private cmder: Commander

  public render: Render
  public rootPath: string
  public dotTemplateRootPath: string = path.resolve(__dirname, '..', '..')

  constructor(public editor: Editor) {
    this.event = new Events()
    this.render = new Render(this)
    this.cmder = new Commander(this, 1)
    this.editor.app = this
    this.rootPath = editor.rootPath

    // 监听新建文件或者文件夹的操作
    let sid: NodeJS.Timer
    let newFiles: string[] = []
    let run = () => {
      let isFirstFile = true
      let files: string[] = []
      let folders: string[] = []

      newFiles.forEach((f, i) => {
        if (fs.existsSync(f)) {
          let stats = fs.statSync(f)
          if (stats.isFile()) {
            files.push(f)
          } else if (stats.isDirectory()) {
            folders.push(f)
            if (i === 0) isFirstFile = false
          }
        }
      })
      newFiles.length = 0
      if (isFirstFile) {
        this.createTemplateFiles(files, true)
        this.createDirectories(folders)
      } else {
        this.createDirectories(folders)
        this.createTemplateFiles(files, true)
      }
    }

    this.event.on('newFile', (filePath: string) => {
      // 执行命令时会创建新文件，会被检测到，要忽略它
      if (this.cmder.fileMaybeCreatedByCommand()) return

      this.debug('监听到新建了文件 %f' + filePath)
      if (sid) clearTimeout(sid)
      newFiles.push(filePath)
      sid = setTimeout(run, 400)
    })

    this.debug('Application rootPath ' + this.rootPath)
    this.debug('Application initialized')
  }

  createRelatedFiles = async (textFile: string) => await this.cmder.addCreateRelatedFilesCommand(textFile)
  createDirectories = async (folders: string[]) => {
    let result = await this.cmder.addCreateDirectoriesCommand(folders)
    if (result) {
      let folder = folders.find(f => path.basename(f) === this.editor.configuration.dtplFolderName)
      if (folder) {
        this.info('恭喜，成功创建 dot-template 配置文件夹 %f，快去该目录下看 dtpl.ts 和 readme.md 文件吧', folder)
      }
    }
    return result
  }
  createTemplateFiles = async (textFile: string[], open: boolean) => await this.cmder.addCreateTemplateFilesCommand(textFile, open)
  undoOrRedo = async () => this.cmder.hasPrev ? await this.cmder.prev() : await this.cmder.next()

  runUserFunction<T>(name: string, fn: (...args: any[]) => T, args: any[] = [], context?: any): T | undefined {
    let result: T | undefined
    try {
      result = fn.apply(context, args)
    } catch(e) {
      this.error('运行自定义函数 ' + name + ' 出错：' + (e && e.message ? e.message : JSON.stringify(e)), e)
    }
    return result
  }

  createSource(filePath: string): Source {
    return new Source(this, filePath)
  }

  /**
   * 将 message 中的 %f 用 files 的相对路径来替换
   */
  format(message: string, ...files: string[]): string {
    let {editor} = this
    if (files.length) {
      message = message.replace(/%f/g, _ => {
        let file = files.shift()
        if (!file) return _
        if (file.indexOf(this.rootPath) >= 0) return editor.getRelativeFilePath(file)
        if (file.indexOf(this.dotTemplateRootPath) >= 0) return '<dot-template>' + file.substr(this.dotTemplateRootPath.length)
        return file
      })
    }
    return message
  }

  debug(message: string, ...files: string[]) {
    this.editor.debug(this.format(message, ...files))
  }
  info(message: string, ...files: string[]) {
    this.editor.info(this.format(message, ...files))
  }
  warning(message: string, ...files: string[]) {
    this.editor.warning(this.format(message, ...files))
  }
  error(message: string, e?: any) {
    this.editor.error(message, e)
  }

  dispose() {
    this.editor.dispose()
    this.editor.debug('Application destroied')
  }

  emitNewFile = (filePath: string) => this.event.emit('newFile', filePath)
  emitCreatedFile = (filePath: string, content: string) => this.event.emit('createdFile', filePath, content)
  emitDeletedFile = (filePath: string, content: string) => this.event.emit('deletedFile', filePath, content)
  emitUpdatedFile = (filePath: string, newContent: string, oldContent: string) => this.event.emit('updatedFile', filePath, newContent, oldContent)
  onCreatedFile = (listener: (filePath: string, content: string) => void) => this.event.on('createdFile', listener)
  onDeletedFile = (listener: (filePath: string, content: string) => void) => this.event.on('deletedFile', listener)
  onUpdatedFile = (listener: (filePath: string, newContent: string, oldContent: string) => void) => this.event.on('updatedFile', listener)
}
