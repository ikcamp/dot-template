# dot-template vscode extension

**自动根据预定义好的合适的模板文件及当前环境变量来快速生成新的文件的内容**

## 特色

* 不区分项目语言，也就是说任何语言都可以使用此插件
* 只用一个快捷键 (win: `ctrl+k ctrl+p` mac: `cmd+k cmd+p`) ，便可以快速匹配模板并生成新文件内容
* 对于 js 或者 ts 文件，支持自动创建同名的样式文件，并插入样式文件的引用
* dtpl 模板文件支持变量高亮
* dtpl 模板文件支持环境变量自动补全


![创建新文件的演示图](https://n1image.hjfile.cn/res7/2017/10/11/1738a1284e501e5d6fdb0ccacd081c7f.jpg)

## 背景

在一个项目中，会经常需要创建一批非常类似的文件。比如在 angular 项目中，根据官方推荐的写法，每个 Controller 需要占一个文件，而各个 Controller 的结构基本相似，唯一不同的可能就是 Controller 的名称及内部的逻辑，所以当要新建一个 Controller 时，我们总需要重复写一些基本的结构。这时，我们可能会随便复制一个写好的 Controller，然后对其进行处理，把它变成一个符合当前文件名称的最简化的 Controller；如果每次这样操作，我们自己也会觉得烦。所以，为什么不可以自动生成一个这样的文件呢？

在 yeoman 的脚手架中，你可能用过通过命令去新生成一个或一批对应的文件，但由于模板文件及大部分变量都是在脚手架项目中预定义好的，这样操作的可控性不太强，所以使用起来也不是很方便。

每个项目都有它自己的语法风格，也可能会有一批结构类似的文件，有时候写着写着也会突然发现又可以提取出一批新的结构类似的文件来。所以我认为，模板文件最好是随时可配置的，并且最好是跟着项目走。另外 vscode 是我目前为止最喜欢的一款编辑器，整个生态系统也都很完善，所以自然而然就想到在它上面开发一款插件，可以自动根据模板来生成内容，也是由于 vscode 的插件系统也很强大，所以也轻而易举给我的模板引擎加上了语法高亮和自动补全！

## 使用

1. 在 vscode 中搜索 `dot-template` 并安装
2. 在项目根目录上新建一个名字为 `.dtpl` 的文件夹

    也可以在项目子文件夹或父文件夹，甚至 HOME 目录下创建 `.dtpl` 文件夹，`dot-template`         会自动逐级向上查找能匹配的模板文件，找到匹配的模板后则立即使用此模板，不再继续向上查找了；另外 HOME 目录是最后查找的一个目录（需要环境变量中有 HOME 变量才能识别出 HOME 目录）

3. 在 `.dtpl` 文件夹中新建模板文件

    - **模板文件命名规则：**
        - 后缀名需要为 `.dtpl`
        - 除去后缀名，其它部分是用于匹配要新建的文件的名称及路径的，但由于文件名中不允许出现路径字符`/`和`\`，所以需要在模板文件名中以`:`替代文件路径
        - 匹配支持使用 `*`、 `**`、`{a,b}` 等通配符，更多详情参考 [minimatch](https://github.com/isaacs/minimatch)
        - 匹配顺序是：路径越长，优先匹配；路径一致，模板名称越长，优先匹配

        所以：

        - 要匹配项目中所有以 `Modal.js` 结尾的文件可以写成 `*Modal.js.dtpl`
        - 要匹配项目中 `widget` 文件中所有 `.rb` 结尾的文件可以写成 `widget:*.rb.dtpl`
        - 要匹配项目中 `widget` 文件中及其子文件夹中所有以 `.rb` 结尾的文件则可以写成 `widget:**:*.rb.dtpl`
        - 要匹配项目中 `foo` 或 `bar` 文件夹下以 `pre` 开头的文件可以写成 `{foo,bar}/pre*.dtpl`

    - **模板文件内容规则：**
        - 模板变量需要以 `$` 开头，如 `$user`, `$date`；
        - 如果变量需要和其它单词组合，或需要使用 `.` 语法时，则需要使用 `${...}` 形式，如：`${user}'s apple`, `${pkg.name}`
        - 默认模板变量有（以文件 `/home/project/hello-world.js` 为例）
            * `rootPath`: 项目根目录，如： `/home/project`
            * `npmPath`: 项目的 node_modules 目录， 如： `/home/project/node_modules`
            * `date`: 当前日期，如： `2017-09-29`
            * `time`: 当前时间，如： `09:12`
            * `datetime`: 当前日期和当前时间的组合，如： `2017-09-29 09:12`
            * `user`: 当前用户名称，取的是环境变量中的 `USER` 字段
            * `pkg`: 当前 package.json 的 JSON 内容
            * `fileName`: 当前文件名称，包含路径，如： `/home/project/hello-world.js`
            * `dirName`: 当前文件的路径，如： `/home/project`
            * `extension`: 当前文件的后缀，如： `.js`
            * `baseName`: 当前文件的基本名称，如 `hello-world`
            * `rawModuleName`: 和 `baseName` 一致
            * `moduleName`: 驼峰形式的 `baseName`
            * `ModuleName`: 单词首字母都大写的形式的 `baseName`
            * `MODULE_NAME`: 所有字母都大写，中间以下划线连接的 `baseName`
            * `module_name`: 所以字母都小写，中间以下划线连接的 `baseName`

        - 模板支持自定义变量
            * 可以通过 `dot-template.globalTemplateVariableFiles` 配置来指定提供全局变量的文件
            * 也可以在模板文件所在的文件夹中添加一个 `local.js` 文件来提供局部变量给当前文件夹下的所有模板使用
            * 自定义变量的文件的写法可以参考 [res/.dtpl/local.js](res/.dtpl/local.js) （全局或局部的文件写法都一样）
            * 另外也可以使用 ts 文件，但需要项目中安装了 `ts-node` 模块

        *模板示例可以参考 [res/.dtpl](./res/.dtpl) 文件夹*

4. 按 `cmd+k cmd+p` (win: `ctrl+k ctrl+p`)来快速根据模板生成文件内容。按快捷键后会有三种不同的情况：

    - 当编辑器当前打开了一个空文件，则 `dot-template` 会根据打开的文件的名称去查找能与之对应的模板，然后根据模板创建新文件，没有匹配到任何模板则会创建一个空文件
    - 当编辑器当前打开了一个有内容的文件，则 `dot-template` 会弹出输入框，询问你是否创建一个新的文件，如果输入了新文件的名称，则 `dot-template` 就会根据这个新文件的名称去查找能与之对应的模板（后续操作同上）；如果没有输入新文件名称，则不执行任何操作
    - 如果当前编辑器没有打开任何一个文件，则`dot-template`也会弹出输入框，询问你是否创建一个新的文件（后续操作同上）


> **总结**
>
> 使用 `dot-template` 只需记住快捷键 `cmd+k cmd+p` (win: `ctrl+k ctrl+p`) 即可，剩下的就是管理模板文件了

**附加功能**

如果当前编辑的是 js 或 ts 文件，可以通过快捷键 `cmd+k cmd+s` 来快速注入样式文件的引用，并创建一个样式文件（如果存在则不会创建）；要修改注入的内容，可以修改配置选项 `dot-template.importStyleTemplate`

![创建样式文件的演示图](https://n1image.hjfile.cn/res7/2017/10/11/622e53aeb073b19b0eed1807db99a293.jpg)

<!--
## Requirements

If you have any requirements or dependencies, add a section describing those and how to install and configure them.
-->

## 项目配置

* `dot-template.templatePathSeparator`: 模板文件名称中的目录分隔符，默认值 `:`

  因为文件名称中不允许出现 `/` 或 `\` 字符，所以为了模拟路径匹配，需要使用一个替代符号

* `dot-template.templateExtension`: 模板文件的后缀名，默认值 `.dtpl`

* `dot-template.templateDirectory`: 存放模板文件的文件夹的名称，默认值 `.dtpl`

* `dot-template.templateMinimatchOptions`: [minimatch 的选项](https://github.com/isaacs/minimatch#options)，用于匹配模板名称，默认值 `{"matchBase": true,"nocomment": true,"dot": true}`

* `dot-template.globalTemplateVariableFiles`: 全局的自定义环境变量文件，支持 json, js, 和 ts 文件，需要使用绝对路径，路径名称中支持变量 `${npmPath}` 和 `${rootPath}`，默认值 `[]`

* `dot-template.localTemplateVariableFileName`: 模板文件目录下的自定义环境变量的文件的名称，不包含路径，不包含后缀名，会自动检查带 `.json`, `.js`, `.ts` 后缀的文件是否存在，存在的话就使用它，默认值 `local`

* `dot-template.importStyleTemplate`: 导入的样式文件模板（按 `cmd+k cmd+p`时生成的内容），默认值 `import './style/$rawModuleName.scss'`，路径中支持使用默认的环境变量

<!--
## Known Issues

Calling out known issues can help limit users opening duplicate issues against your extension.
-->

## 待办事项

* [ ] 支持其它 render，如 ejs

## Release Notes

### 0.0.1

Initial release
