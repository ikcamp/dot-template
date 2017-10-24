import {workspace} from 'vscode'
const c = workspace.getConfiguration('dot-template')

export const config = {
  /** path separator in template file name */
  get templatePathSeparator(): string {
    return c.get('templatePathSeparator') || ':' // 此值一定要存在，避免用户将其设置为空
  },
  /** template file's extension */
  get templateExtension(): string {
    return c.get('templateExtension')
  },
  /** template directory which contains template files */
  get templateDirectory(): string {
    return c.get('templateDirectory') || '.dtpl'
  },
  /** minimatch options used in template name match, ref: https://github.com/isaacs/minimatch#options */
  get templateMinimatchOptions(): any {
    return c.get('templateMinimatchOptions')
  },
  /** js files or ts(install `ts-node` first) files that generate custom template variables */
  get globalTemplateVariableFiles(): string[] {
    return c.get('globalTemplateVariableFiles')
  },
  /** local template variable file name without extension and path, support json, js and ts format */
  get localTemplateVariableFileName(): string {
    return c.get('localTemplateVariableFileName')
  },

  /** 根据当前文件，创建一个与之相关的文件时的文件路径（按 `cmd+k cmd+r`时生成的文件） */
  get referenceFilePath(): string {
    return c.get('referenceFilePath')
  },

  /** 导入的样式文件模板（按 `cmd+k cmd+s`时生成的内容），路径中支持使用默认的环境变量和全局的环境变量 */
  get importStyleTemplate(): string {
    return c.get('importStyleTemplate')
  }
}
