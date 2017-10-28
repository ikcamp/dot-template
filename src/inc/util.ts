import * as fs from 'fs-extra'
import * as path from 'path'
import * as vscode from 'vscode'

/** dot-template 项目的根目录 */
export const dtplRootPath = path.resolve(__dirname, '..', '..')

/** 项目根目录 */
export const rootPath = vscode.workspace && vscode.workspace.rootPath || process.cwd()

/**
 * 获取到 filepath 相对于项目根目录的路径
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

/** 获取文件内容 */
export function getFileContent(file: string): string {
  return fs.readFileSync(file).toString()
}

export function warning(str: string) {
  vscode.window.showWarningMessage(`dtpl: ${str}`)
}
