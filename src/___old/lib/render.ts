import * as DotProp from 'mora-scripts/libs/lang/DotProp'
import * as fs from 'fs-extra'

import * as _ from '../inc/'

const TPL_VARABLE_REGEXP = /\$([a-zA-Z][\-\w]*)|\$\{([a-zA-Z][\-\w\.]*)\}/g

export function render(templatePath: string, data: _.IObject): string
export function render(templatePath: string, templateContent: string, data: _.IObject): string
export function render(templatePath: string, templateContentOrData: string | _.IObject, data?: _.IObject): string {
  let exts = _.config.renderExtensions
  let content: string
  let templateContent: string
  if (typeof templateContentOrData === 'string') {
    templateContent = templateContentOrData
  } else {
    templateContent = fs.readFileSync(templatePath).toString()
    data = templateContentOrData
  }

  if (templatePath.endsWith(exts.ejs)) {
    content = ejsRender(templateContent, data as _.IObject)
  } else if (templatePath.endsWith(exts.dtpl)) {
    content = dtplRender(templateContent, data as _.IObject)
  } else if (templatePath.endsWith(exts.njk)) {
    content = njkRender(templateContent, data as _.IObject)
  } else {
    content = templateContent
  }

  return content
}

export function dtplRender(content: string, data: _.IObject): string {
  return content.replace(TPL_VARABLE_REGEXP, (raw, key1, key2) => {
    let key = key1 || key2
    if (key in data) return data[key]
    if (key.indexOf('.') > 0 && DotProp.has(data, key)) return DotProp.get(data, key)
    return raw
  })
}

export function ejsRender(content: string, data: _.IObject): string {
  return require('ejs').compile(content, {})(data)
}

export function njkRender(content: string, data: _.IObject): string {
  return content
}

export function stripTemplateExtension(templatePath: string): string {
  let es = _.config.renderExtensions
  let len = 0
  if (templatePath.endsWith(es.ejs)) {
    len = es.ejs.length
  } else if (templatePath.endsWith(es.dtpl)) {
    len = es.dtpl.length
  } else if (templatePath.endsWith(es.njk)) {
    len = es.njk.length
  }
  return templatePath.substr(0, templatePath.length - len)
}
