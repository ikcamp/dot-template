import * as path from 'path'
import * as _ from '../common/interface'

export default function(source: _.Source): _.IDtplConfig {
  return {
    templates: [
      {
        // 指定模板名称，需要在同目录下有个同名的文本文件或者文件夹
        // 当前指定的是一个文件夹模板
        name: '../../res/template',

        data: {
          interface: path.resolve(__dirname, '..', '..', 'out', 'core', 'common', 'interface')
        },

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
        filter(copy: _.ICopySource): boolean | _.ICopyFilterResult {
          if (copy.name === 'dtpl.ts') return true
          return {
            name: copy.rawName,
            content: copy.rawContent
          }
        },

        afterFilter(fromDir: string, toDir: string, result: _.ICopyResult): void {

        }
      }
    ],

    globalData: {

    }
  }
}
