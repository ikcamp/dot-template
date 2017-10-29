import * as _ from '../../src/inc/interface'

export function getTemplates(param: _.IHookParameter): _.ITemplates {
  return [
    {
      name: 'folder',
      matches: 'xxxx'
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

export function getLocalData(template: _.ITemplate, param: _.IHookParameter): _.ILocalData | undefined {
  return
}
