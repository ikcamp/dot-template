import * as _ from '../../../../common/interface'

export function getTemplates(source: _.Source): _.IUserTemplate[] {
  let newline = source.app.editor.EOL + 'newline' + source.app.editor.EOL
  return [
    {
      name: 'no-inject',
      matches: (minimatch) => {
        return source.filePath.indexOf('no-inject') >= 0
      },
      related: () => {
        return [
          {
            relativePath: './relative/no-inject'
          },
          {
            relativePath: 'absolute/other'
          }
        ]
      }
    },
    {
      name: 'inject',
      matches: 'inject-start',
      related: () => {
        return [{
          relativePath: './a',
          reference: newline
        }]
      }
    },
    {
      name: 'inject',
      matches: 'inject-row',
      related: () => {
        return [{
          relativePath: './a',
          reference: newline,
          begin: {row: 1, col: 0}
        }]
      }
    },
    {
      name: 'inject',
      matches: 'inject-col',
      related: () => {
        return [{
          relativePath: './a',
          reference: newline,
          begin: {row: 1, col: 4}
        }]
      }
    },
    {
      name: 'inject',
      matches: 'inject-overflow',
      related: () => {
        return [{
          relativePath: './a',
          reference: newline,
          begin: {row: 100, col: 400}
        }]
      }
    },

    {
      name: 'replace',
      matches: 'replace*',
      related: () => {
        return []
      }
    }
  ]
}
