import * as _ from '../../../../common/interface'

export function getTemplates(source: _.Source): _.IUserTemplate[] {
  return [
    {
      name: 'upper.dtpl',
      matches: ['upper*']
    },
    {
      name: 'variable.dtpl',
      matches: ['var-yes*'],
      data: {
        foo: {bar: 'foobar'}
      }
    },
    {
      name: 'variable.dtpl',
      matches: ['var-no*'],
      data: {foo: 'foo', bar: 'bar'}
    },
    {
      name: 'text.txt',
      matches: ['text*']
    }
  ]
}
