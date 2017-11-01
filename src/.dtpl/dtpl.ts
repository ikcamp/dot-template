import * as path from 'path'
// import * as os from 'os'
import * as _ from '../common/interface'

/**
 * 这个是在所有用户设置的模板的最后面匹配的
 */
export function getTemplates(source: _.Source): _.IUserTemplate[] {
  return [
    {
      // 指定模板名称，需要在同目录下有个同名的文本文件或者文件夹
      // 当前指定的是一个文件夹模板
      name: '../../res/template',
      // 根据用户当前正在创建或编辑的文件的信息来判断是否需要使用此模板来处理此文件
      matches: () => {
        let {isDirectory, filePath} = source
        return isDirectory && path.basename(filePath) === source.app.editor.configuration.dtplFolderName
      },

      /**
       * 当用户创建了指定的文件夹后，系统会自动复制此模板文件夹下的所有文件到这个新创建的文件
       * 你可以用此函数来过滤掉一些你不需要复制的文件
       * 或者返回新的文件路径和内容
       */
      filter(source: _.ICopySource): boolean | _.ICopyFilterResult {
        if (source.name === 'dtpl.ts') return true
        return {
          name: source.rawName,
          content: source.rawContent
        }
      },

      afterFilter(fromDir: string, toDir: string, result: _.ICopyResult): void {

      }
    }
  ]
}

/**
 * 生成自定义的数据，在渲染模板时会使用；注意，在创建三种不同的文件时，数据结构会有细微不一样
 *
 * - 创建文本文件
 *
 *  文件文件默认的 data 会和此函数返回的数据 merge
 *
 * - 创建关联文件
 *
 *  源文件和关联文件可能都会有它自己的模板，有它自己的 localData，
 *  所以它们的 data 会和各自的 localData 合并，有一点不一样的是，
 *  关联文件可以通过 ref 来引用源文件的所有 data 数据
 *
 * - 创建文件夹模板内的文件
 *
 *  模板文件夹内的文件都没有 localData，但它可以通过 ref 获取到文件夹模板的 data 数据，
 *  而文件夹模板是可以包含 localData 的
 */
export function getLocalData(template: _.IUserTemplate, source: _.Source): _.IObject {
  return {
    // 将 interface 文件的绝对路径记录到 interface 上
    // 在创建文件夹模板内的文件时，可以通过 ref.interface 来引用此值
    interface: path.resolve(__dirname, '..', '..', 'out', 'core', 'common', 'interface')
  }
}
