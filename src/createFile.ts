import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs-extra'
import * as os from 'os'
import * as minimatch from 'minimatch'
import * as findup from 'mora-scripts/libs/fs/findup'
import * as escapeRegExp from 'mora-scripts/libs/lang/escapeRegExp'
import {getEnvData,  getLocalCustomEnvData, render, rootPath, IEnvData} from './inc/helper'
import {config} from './inc/config'

const {window, workspace} = vscode

export function createScriptFile() {
  const editor = window.activeTextEditor
  let created

  let createFile = (filepath: string) => {
    created = true
    fs.ensureFileSync(filepath)
    openFile(filepath, () => insertSnippet(getTemplate(filepath)))
  }

  if (editor) {
    let fileName = editor.document.fileName
    let dirName = path.dirname(fileName)
    let content = editor.document.getText()

    if (content.trim()) {
      let {start, end} = editor.selection

      // 当前光标所在的行上引用了一个不存在的文件
      for (let lineNumber = start.line; lineNumber <= end.line; lineNumber++) {
        let lineText = editor.document.lineAt(lineNumber).text
        // 识别『 import Test from './Test' 』 和  『 const Test = require('./Test') 』
        if ( /^\s*import\s+.*?\s+from\s+'([^\)]+)'/.test(lineText) || /require\('([^\)]+)'\)/.test(lineText)) {
          let filepath = RegExp.$1
          let absFilepath = path.resolve(dirName, filepath)
          if (!(/\.\w+$/.test(absFilepath))) absFilepath += path.extname(fileName)

          // 必须是相对路径，并且文件不存在
          if (filepath[0] === '.' && !fs.existsSync(absFilepath)) {
            createFile(absFilepath)
            break
          }
        }
      }

      // 没有找到一个可以创建的文件，则提示用户输入文件路径
      if (!created) {
        window.showInputBox({placeHolder: '请输入要创建的文件名（相对当前文件的路径）'}).then(f => f && createFile(path.resolve(dirName, f)))
      }
    } else {
      insertSnippet(getTemplate(editor.document.fileName))
    }
  } else {
    window.showInputBox({placeHolder: '请输入要创建的文件名（相对于根目录）'}).then(f => f && createFile(path.resolve(rootPath, f)))
  }
}

export function createStyleFile() {
  let editor = window.activeTextEditor
  if (!editor) return

  const envData = getEnvData(editor.document.fileName)
  const {dirName} = envData
  const importStyleTemplate = config.importStyleTemplate
  const importStyle = render(importStyleTemplate, envData)

  const stylePathReg = /(['"])(.*?)\1/
  if (!stylePathReg.test(importStyle)) {
    return window.showErrorMessage('Can\'ot find style template in config `importStyleTemplate=' + JSON.stringify(importStyleTemplate) + '`')
  }
  let stylePath = RegExp.$2
  let styleFile = path.resolve(dirName, stylePath)
  fs.ensureFileSync(styleFile)

  let isStyleRefExists = false
  let lastImportLineNumber = -1 // 文件中使用 import 的最后一行

  eachDocumentLine(editor.document, (line, lineNumber) => {
    let {text} = line
    if (text.indexOf(stylePath) >= 0) {
      isStyleRefExists = true

    if (/^(\s*\/\/\s*)/.test(text)) {
        editor.edit(eb => {
          let startPos = new vscode.Position(lineNumber, 0)
          let endPos = new vscode.Position(lineNumber, RegExp.$1.length)
          eb.replace(new vscode.Range(startPos, endPos), '')
        })
      }
    }

    if (/^(import|(var|let|const)\s+\w+\s+=\s+require)\b/.test(text)) lastImportLineNumber = lineNumber

    return !isStyleRefExists // 找到了就不用再找了
  })

  // 文件中没有引用样式引用的话，就手动添加引用
  if (!isStyleRefExists) {
    editor.edit(eb => eb.insert(new vscode.Position(lastImportLineNumber + 1, 0), `${os.EOL}${importStyle}${os.EOL}`))
  }

  openFile(styleFile, (doc, trimContent) => {
    if (!trimContent) {
      insertSnippet(getTemplate(styleFile, envData)) // 样式是附属文件，使用主文件的 envData
    }
  })
}

function getTemplate(fileName: string, envData?: IEnvData): string {
  let tplDir = config.templateDirectory
  envData = envData || getEnvData(fileName)

  try {
    let findFromDir = path.dirname(fileName)
    let content
    while (typeof content !== 'string') {
      let findTplDir = findup.dir(findFromDir, tplDir)
      content = getTemplateFromDir(fileName, findTplDir, envData)
      if (!content) findFromDir = path.dirname(path.dirname(findTplDir))
    }
    return content
  } catch (e) {
    if (process.env.HOME) {
      let homeTplDir = path.join(process.env.HOME, tplDir)
      if (fs.existsSync(homeTplDir)) {
        let content = getTemplateFromDir(fileName, homeTplDir, envData)
        return content || ''
      }
    }
    return ''
  }
}

function getTemplateFromDir(fileName: string, tplDir: string, envData: IEnvData): false | string {
  // console.log('search dtpl directory in', tplDir)

  const tplExtension = config.templateExtension
  const tplPathSep = config.templatePathSeparator
  const minimatchOpts = config.templateMinimatchOptions

  let tplNames = fs.readdirSync(tplDir).filter(f => !tplExtension || f.endsWith(tplExtension))
  if (!tplNames.length) return false

  const sepReg = new RegExp(escapeRegExp(tplPathSep), 'g')
  const patternTplNames = tplNames
    .map(n => n.substr(0, n.length - tplExtension.length)) // 去除后缀
    .map(n => n.replace(sepReg, path.sep))  // 替换目录分隔符
    .map(n => !n.startsWith('**') ? path.join('**', n) : n) // 添加 ** 前缀，匹配前面所有的目录

  // 方便恢复原文件地址
  const tplNameMap = patternTplNames.reduce((map, name, index) => {
    map[name] = tplNames[index]
    return map
  }, {})

  // 排序：路径多的优先匹配
  const pathReg = /[\/\\]/g
  const sortMap = patternTplNames.reduce((map, name) => {
    let m = name.match(pathReg)
    // 路径越长，优先级越高；路径一样，名字越长，优先级越高
    map[name] = (m ? m.length * 100 : 0) + name.length
    return map
  }, {})
  patternTplNames.sort((a, b) => sortMap[b] - sortMap[a])
  const foundTpl = patternTplNames.find(t => minimatch(fileName, t, minimatchOpts))
  if (foundTpl) {
    // console.log('found dtpl', foundTpl)
    const content = fs.readFileSync(path.join(tplDir, tplNameMap[foundTpl])).toString()
    return content.trim() ? render(content, {...envData, ...getLocalCustomEnvData(tplDir)}) : content
  } else {
    return false
  }
}

function openFile(file, cb: (doc: vscode.TextDocument, trimContent: string) => any) {
  workspace.openTextDocument(file).then(doc => {
    window.showTextDocument(doc).then(() => {
      cb(doc, doc.getText().trim())
    })
  })
}

function eachDocumentLine(doc: vscode.TextDocument, fn: (line: vscode.TextLine, index: number) => any) {
  let lineCount = doc.lineCount
  for (let i = 0; i < lineCount; i++) {
    if (fn(doc.lineAt(i), i) === false) break
  }
}

// function isRunnable() {
//   let editor = window.activeTextEditor
//   if (!editor) {
//     window.showErrorMessage('dot-template: no active text editor!')
//     return false
//   }

//   let langId = editor.document.languageId;
//   if (langId !== 'typescriptreact' && langId != 'javascriptreact') {
//     window.showErrorMessage('dot-template: not react language!')
//     return false
//   }

//   return true
// }

function insertSnippet(content: string, pos?: vscode.Position) {
  window.activeTextEditor.insertSnippet(new vscode.SnippetString(content), pos)
}


