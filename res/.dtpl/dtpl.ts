import * as _ from '../../src/inc/interface'

import * as path from 'path'

// 这个是在所有用户设置的模板的最后面匹配的
export function getTemplates(source: _.ISource): _.ITemplates {
  return [
    {
      name: 'template',
      matches: () => {
        let {isDirectory, filePath, configuration} = source
        return isDirectory && path.basename(filePath) === configuration.dtplFolderName
      }
    },
    {
      name: 'example2.ts.dtpl',
      matches: 'widget/*.ts'
    },

    {
      name: 'example1.ts.dtpl',
      sample: 'src/hello-world.ts',
      matches: '**/*.ts',
      related: (data: _.IData, fileContent: string) => {
        let ref = `./styles/${data.rawModuleName}.scss`
        return {
          relativePath: ref,
          reference: `import '${ref}'`,
          smartInsertStyle: true
        }
      }
    }
  ]
}

export function getLocalData(template: _.ITemplate, source: _.ISource): _.ILocalData | undefined {
  return
}
