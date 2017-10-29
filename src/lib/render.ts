import * as DotProp from 'mora-scripts/libs/lang/DotProp'
import * as fs from 'fs-extra'

import * as _ from '../inc/'

const TPL_VARABLE_REGEXP = /\$([a-zA-Z][\-\w]*)|\$\{([a-zA-Z][\-\w\.]*)\}/g

export function render(templatePath: string, data: {[key: string]: any}) {
  let exts = _.config.renderExtensions
  let content = fs.readFileSync(templatePath).toString()

  if (templatePath.endsWith(exts.ejs)) {

  } else if (templatePath.endsWith(exts.dtpl)) {
    return content.replace(TPL_VARABLE_REGEXP, (raw, key1, key2) => {
      let key = key1 || key2
      if (key in data) return data[key]
      if (key.indexOf('.') > 0 && DotProp.has(data, key)) return DotProp.get(data, key)
      return ''
    })

  } else if (templatePath.endsWith(exts.njk)) {

  }

  return content
}
