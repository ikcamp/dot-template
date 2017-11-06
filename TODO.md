* 打开（最好以预览的方式打开） .dtpl 目录下的 readme 文件（和下面的这条只要有一个存在就好）
* 新建完目录时，最好展开它

    // 先显示 explorer 窗口
    vscode.commands.executeCommand('workbench.view.explorer')

* 创建文件夹时，可以通过 filter 把文件复制到外面的一个目录里去，这时 revoke 无法删除它

* 在线获取 template 模板（包括文件和目录）
* 添加 vscode 的右键命令，即当鼠标放在右侧的文件或文件夹上时
* 优先使用用户本地的 ts-node

* 支持配置渲染引擎
* 扩展 `.dtpl` 模板的功能
* 添加 vscode 测试 和 cli 测试
* 给 .dtpl 模板文件添加一个 icon
* 发布后需要确认下在没有 tsconfig.json 文件时能否正常编译用户目录下的 dtpl.ts 文件


* related 文件支持 inject 一些信息到原文件上，inject 支持 append


官方示例大全 https://github.com/Microsoft/vscode-extension-samples
