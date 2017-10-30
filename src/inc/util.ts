import * as fs from 'fs-extra'
import * as path from 'path'
import * as vscode from 'vscode'

export const debug = vscode.workspace.getConfiguration('dot-template').get('debug')

/** dot-template 项目的根目录 */
export const dtplRootPath = path.resolve(__dirname, '..', '..')

/** 项目根目录 */
export const rootPath = vscode.workspace && vscode.workspace.rootPath || process.cwd()

const jsLanguageIds = ['typescriptreact', 'javascriptreact', 'typescript', 'javascript']
export function isJsEditor(editor: vscode.TextEditor) {
  return jsLanguageIds.includes(editor.document.languageId)
}

export function delay<T>(timeout: number, any?: T): Promise<T> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(any), timeout)
  })
}

/**
 * 获取到文件相对于项目根目录的路径
 */
export function getRelativeFilePath(filepath: string) {
  return path.relative(rootPath, filepath)
}

/**
 * 获取正在编辑的文件的 TextEditor 对象
 */
export function getActiveEditor(): vscode.TextEditor | null {
  let {window} = vscode
  return window && window.activeTextEditor ? window.activeTextEditor : null
}

/**
 * 获取当前正在编辑的文件的路径
 */
export function getActiveFile(): string | null {
  let editor = getActiveEditor()
  return editor && editor.document ? editor.document.fileName : null
}

const importOrExportRegexp = /^\s*(?:import|export)\s+.*?\s+from\s+['"]([^'"]+)['"]/mg
const requireRegExp = /^\s*(?:var|let|const|import)\s+\w+\s+=\s+require\(['"]([^'"]+)['"]\)/mg
/**
 * 查找 js 文件中引用的其它文件，一般是通过 require 或 import 语法来引用的
 *
 * 如：
 *
 * ```
 *  import Test from './Test'
 *  export * from './Test'
 *  const Test = require('./Test')
 *  import Test = require('./Test')
 * ```
 *
 */
export function findJsRelatedFiles(jsfile: string, fileContent: string): string[] {
  let result: string[] = []

  let add = (from: string): string => {
    // 一定要是相对目录
    if (from[0] === '.') {
      let file = path.resolve(path.dirname(jsfile), from)

      // 如果没有后缀，要加上当前文件的后缀
      if (!(/\.\w+$/.test(file))) file += path.extname(jsfile)

      if (result.indexOf(file) < 0) result.push(file)
    }
    return ''
  }

  fileContent.replace(importOrExportRegexp, (raw, from) => add(from))
  fileContent.replace(requireRegExp, (raw, from) => add(from))

  return result
}

let requireTsFileEnabled = false
export function enableRequireTsFile() {
  if (requireTsFileEnabled) return
  require('ts-node/register')
  requireTsFileEnabled = true
}

export function warning(str: string) {
  vscode.window.showWarningMessage(`dtpl: ${str}`)
}

export function error(e: any) {
  console.error(e)
  vscode.window.showErrorMessage(`dtpl: ${e.message || JSON.stringify(e)}`)
}

export function log(...args: any[]) {
  if (debug) console.log('[dot-template]', ...args)
}


/**
 * 按先后顺序一个个用 run 函数来运行 tasks 中的字段
 *
 * @export
 * @template T
 * @template R
 * @param {T[]} tasks 要运行的任务
 * @param {(task: T) => Promise<R>} run 运行函数
 * @returns {Promise<R[]>} 返回每个 tasks 对应的结果组成的数组
 */
export async function series<T, R>(tasks: T[], run: (task: T, index: number, tasks: T[]) => Promise<R>): Promise<R[]> {
  let result: R[] = []
  if (!tasks.length) return result

  let handle: any = tasks.slice(1).reduce(
    (prev, task: T, index, ref) => {
      return async () => {
        result.push(await prev())
        return await run(task, index + 1, ref)
      }
    },
    async () => await run(tasks[0], 0, tasks)
  )
  result.push(await handle())
  return result
}

/**
 * 判断文件是否打开了
 *
 * @export
 * @param {string} file
 * @returns {boolean}
 */
export function isOpened(file: string): boolean {
  return vscode.window.visibleTextEditors.some(editor => editor.document.fileName === file)
}

/**
 * 打开指定的文件，并返回它的 Editor 对象
 * @param file - 文件路径，请确保文件存在
 */
export async function openFile(file: string): Promise<vscode.TextEditor> {
  let editor = getFileEditor(file)
  if (!editor) {
    editor = await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(file))
  } else if (editor !== vscode.window.activeTextEditor) {
    editor = await vscode.window.showTextDocument(editor.document)
  }

  // vscode 有两种打开，一种是临时打开，在打开下一个临时文件时会覆盖上一个
  // 此时当然不是临时打开，需要一直打开着
  await vscode.commands.executeCommand(`workbench.action.keepEditor`)
  return editor
}

/**
 * vscode 关闭指定的文件，如果文件没保存会强制自动保存
 *
 * @export
 * @param {string} file
 * @returns {Promise<boolean>} 执行成功与否
 */
export async function closeFile(file: string): Promise<boolean> {
  let editor = getFileEditor(file)
  if (!editor) return true
  if (editor.document.isDirty && false === (await editor.document.save())) {
    return false
  }

  await vscode.commands.executeCommand(`workbench.action.closeActiveEditor`)
  return !isOpened(file)
}

/** 获取文件内容 */
export function getFileContent(file: string): string {
  let editor = getFileEditor(file)
  if (editor) {
    return editor.document.getText()
  }
  return fs.readFileSync(file).toString()
}

/**
 * 获取打开的文件的 Editor 对象，如果文件没打开，则返回 undefined
 *
 * @export
 * @param {string} file
 * @returns {vscode.TextEditor}
 */
export function getFileEditor(file: string): undefined | vscode.TextEditor {
  return vscode.window.visibleTextEditors.find(editor => editor.document.fileName === file)
}

/**
 * 异步设置 editor 的内容
 *
 * @export
 * @param {vscode.TextEditor} editor
 * @param {string} content
 */
export async function setEditorContentAsync(editor: vscode.TextEditor, content: string, posOrRange?: vscode.Position | vscode.Range): Promise<boolean> {
  let lastLine = editor.document.lineAt(editor.document.lineCount - 1)
  let start = new vscode.Position(0, 0)

  if (!posOrRange) posOrRange = new vscode.Range(start, lastLine.range.end)
  let result = await editor.insertSnippet(new vscode.SnippetString(content), posOrRange)
  // 不要保存，保存了会触发 webpack 更新代码，不好
  // if (result) await editor.document.save()
  return result
}

export async function setFileContentAsync(file: string, content: string): Promise<boolean> {
  let editor = getFileEditor(file)
  if (editor) {
    return await setEditorContentAsync(editor, content)
  } else {
    fs.writeFileSync(file, content)
    return true
  }
}

/** 弹出确认对话框 */
export async function confirm(message: string, {yes = '确认', no = '取消'} = {}): Promise<boolean> {
  let chose = await vscode.window.showQuickPick([yes, no], {placeHolder: message})
  return chose === yes
}

export function runUserFn<T>(name: string, fn: (...args: any[]) => T, args: any[] = [], context?: any): T | undefined {
  let result: T | undefined
  try {
    result = fn.apply(context, args)
  } catch(e) {
    vscode.window.showErrorMessage('运行自定义函数 ' + name + ' 出错：' + (e && e.message ? e.message : JSON.stringify(e)))
    console.error(e)
  }
  return result
}
