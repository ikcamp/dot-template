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
  /** style file import format, used for create local style file and add reference to current file */
  get importStyleTemplate(): string {
    return c.get('importStyleTemplate')
  }
}
