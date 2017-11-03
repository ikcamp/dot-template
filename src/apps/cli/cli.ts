import * as cli from 'mora-scripts/libs/tty/cli'
// import {Application} from '../../core/Application'
// import {CliEditor} from '../../adapter/CliEditor'

cli({
  usage: 'dtpl <command> [options]',
  desc: [
    '根据预定义的模板，快速生成新文件的内容，或者文件夹内的文件'
  ]
})
.options({
  'd | debug': '<boolean> 调试，会输出大量信息'
})
.commands({
  touch: {
    desc: '用模板创建新文件',
    cmd(top) {
      cli({
        usage: 'dtpl touch <file1, file2, ...>'
      }).parse(top._, function(res) {
        if (!res._.length) return this.error('请指定要创建的文件')
      })
    }
  },
  mkdir: {
    desc: '用模板目录创建新目录',
    cmd(top) {
      cli({
        usage: 'dtpl mkdir <dir1, dir2, ...>'
      }).parse(top._, function(res) {
        if (!res._.length) return this.error('请指定要创建的文件夹')
      })
    }
  },
  'watch | w': {
    // watch 模式下才可以支持撤销操作
    desc: '启动 watch 服务器，自动监听文件变化，从而注入内容',
    cmd(top) {

    }
  }
}).parse(function() {
  this.help()
})
