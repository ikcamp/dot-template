import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs-extra'
import {camel, cap, upper, snake/*, kebab */} from 'naming-transform'
import * as DotProp from 'mora-scripts/libs/lang/DotProp'
import {config} from './config'

const {workspace, window} = vscode
const TPL_VARABLE_REGEXP = /\$([a-zA-Z][\-\w]*)|\$\{([a-zA-Z][\-\w\.]*)\}/g
let _isTsEnabled: boolean

export const rootPath = workspace.rootPath || process.cwd()

export interface IEnvData {
  rootPath: string
  npmPath: string
  date: string
  time: string
  datetime: string
  user: string
  pkg: any

  fileName?: string
  dirName?: string
  extension?: string
  baseName?: string
  rawModuleName?: string
  moduleName?: string
  ModuleName?: string
  MODULE_NAME?: string
  module_name?: string
}

export function getEnvData(fileName?: string): IEnvData {
  let d = new Date()
  let pad = n => n < 10 ? '0' + n : n
  let date = [d.getFullYear(), d.getMonth() + 1, d.getDate()].map(pad).join('-')
  let time = [d.getHours(), d.getMinutes()].map(pad).join(':')

  let pkg = {}
  try { pkg = require(path.join(rootPath, 'package.json')) } catch (e) { }

  let data: IEnvData = {
    rootPath,
    npmPath: path.join(rootPath, 'node_modules'),
    date,
    time,
    datetime: date + ' ' + time,
    user: process.env.USER,
    pkg,
  }

  if (window.activeTextEditor && window.activeTextEditor.document.fileName) {
    const {fileName} = window.activeTextEditor.document
    let dirName = path.dirname(fileName)
    let extension = path.extname(fileName)
    let baseName = path.basename(fileName, extension)

    data = {
      ...data,

      fileName,
      dirName,
      extension,
      baseName,
      rawModuleName: baseName,
      moduleName: camel(baseName),
      ModuleName: cap(baseName),
      MODULE_NAME: upper(baseName),
      module_name: snake(baseName),
      // 'module-name': kebab(baseName) // module-name 不能当变量名
    }
  }

  return {...data, ..._getGlobalCustomEnvData(data)}
}

export function getLocalCustomEnvData(folder: string): any {
  const localVariableFileName = config.localTemplateVariableFileName
  if (!localVariableFileName) return {}

  let detects = ['', '.json', '.js', '.ts']
  let localFile = detects
    .map(d => path.join(folder, localVariableFileName + d))
    .find(f => fs.existsSync(f))

  return localFile ? _getCustomEnvDataFromFile(localFile) : {}
}

export function render(tpl: string, data: any): string {
  return tpl.replace(TPL_VARABLE_REGEXP, (_, key1, key2) => {
    let key = key1 || key2
    if (key) {
      if (key in data) return data[key]
      if (key.indexOf('.') > 0 && DotProp.has(data, key)) {
        return DotProp.get(data, key)
      }
    }
    return _
  })
}

function isTsEnabled() {
  if (_isTsEnabled == null) {
    try {
      const registerFile = path.join(rootPath, 'node_modules', 'ts-node', 'register')
      require(registerFile)
      _isTsEnabled = true
    } catch (e) {
      _isTsEnabled = false
    }
  }
  return _isTsEnabled
}

function _getGlobalCustomEnvData(data: IEnvData): any {
  const generateTemplateVariableFiles = config.globalTemplateVariableFiles
  if (!generateTemplateVariableFiles.length) return

  return generateTemplateVariableFiles.reduce((all, file) => {
    return {...data, ..._getCustomEnvDataFromFile(path.resolve(rootPath, render(file, data)))}
  }, {})
}

function _getCustomEnvDataFromFile(file: string): any {
  const isTsFile = file.endsWith('.ts') || file.endsWith('.tsx')
  if (isTsFile && !isTsEnabled()) {
    window.showErrorMessage(`package "ts-node" is not installed, file ${file} can't compiled`)
    return {}
  }
  try {
    delete require.cache[require.resolve(file)]
    let r = require(file)
    if (r && r.default) r = r.default
    if (typeof r === 'function') r = r(vscode)
    return r || {}
  } catch (e) {
    window.showErrorMessage(`Load custom variables from file ${file} error: ${e.message}`)
    return {}
  }
}
