# dot-template 解放 `Ctrl + C` & `Ctrl + V`


## 作为程序员的你，是否经常会被下面的几个问题所困扰：

1. 开启一个新项目，但是想复用以前项目的一些基础代码，这时你不得不一个文件一个文件的把一些代码 Copy 到新项目来，一不留神还经常出问题；或者干脆复制整个项目过来，然后进行繁杂的删减操作
2. 创建一个新文件，但是一些基础代码不想一行行的写，这时你 Copy 另一个已经写好了的同类型的文件的代码，然后删除一些逻辑代码，并修改相关名称，忙的不亦乐乎，最后发现其实比手写没省多少时间
3. 当项目大了之后，模块化了之后，很多文件是会有关联的，比如有个 `About.jsx` 的 React 组件页面，你一般也会需要一个同名的样式文件放在固定的某个目录下，比如 `style/About.css`，你需要手动去新建它，并在 `About.jsx` 中插入到它的引用 `require('./style/About.css')`，虽然没什么的，但是如果有程序可以帮你自动创建并插入引用，岂不快哉？


## 不想偷懒的程序员不是一个好程序员

将上面三个问题总结下，无非就是下面三个问题：

> 1、如何快速创建一个项目？
>
> **使用项目模板**
>
> 2、如何快速创建一个页面？
>
> **使用页面模板**
>
> 3、如何快速创建一个关联文件？
>
> **使用关联文件配置（也不知道叫什么好）**

### 项目模板

关于项目模板，很多公司可能会有它自己的一套快速创建新项目的方法，而且开源社区也有 [yeoman][yeoman] 这样的脚手架。作为曾经 yeoman 的重度用户，我创建过不少 yeoman 脚手架，比如给开发网站程序用的 [generator-node-babel][generator-node-babel]，给开发 node 应用程序用的 [generator-nody][generator-nody]，不过这些项目都是很久以前做的了，而且很长时间都没更新过，我也重来都没想去整理它们了，最后只能沦为网络垃圾！

我不再使用 yeoman 去创建项目模板的原因大致是：

* 项目模板使用频次不高，只有在新启项目的时候才需要
* 社区技术变化太快了，当新启项目时发现以前写的技术都落后了
* 自由时间太少，没精力去维护
* 用 yeoman 维护项目模板也不是很方便

**而用 dot-template 就不一样了，你甚至不用写任何脚本，可以将项目模板文件快速灵活的复制到另一个地方**

### 页面模板

最近在沪江工作中，大部分项目都使用上了 React ，而且项目内的每个组件、每个页面基本上都模块化了，功能相似的模块之间的代码会有很多重复的地方，比如下面这个是 Home 页面的基础代码，而在 About 页面中你也会看到类似的结构，无非就是把代码里的 Home 换成了 About

```jsx
import * as React from 'react'
import {PageComponent, Page, inject} from '../base'
import './styles/Home.scss'

@inject('app')
export class Home extends PageComponent {
  render() {
    return (
      <Page name='Home' title='页面标题'>
        // ...
      </Page>
    )
  }
}
```

每新建一个 router 的页面，基本上都要写上面的代码，忒烦！之前有在用 [vscode 的 snippet][vscode-snippet] 来完成页面模板的功能，它对于小片的代码很灵活，但对于这种页面级别的代码一点也不方便：

* 首先里面的一些需要自动替换的变量， vscode 不会自动根据文件名称替换，[新版本的 vscode 虽然已经添加了一些内置的变量][vscode-snippet-variables]，但太少了，而且好像也不可以自定义新的变量
* 随着项目的迭代，页面的基础代码也可能会变，这时你得去更新 vscode 上不太直观的 snippet 代码
* 另外，切换项目后，你的 snippet 可能又不一样，又得维护一套
* 最后，你还要去记能触发这些 snippet 的 trigger 键，snippet 越多，记忆负担就越重

我用 vscode 自定义的 snippet 去做页面模板的时候，刚开始用的很爽，最后随着项目的迭代，我都懒的去更新它们了，最后大部分 snippet 都废弃了 [捂脸]

**dot-template 将每个页面的模板放在当前项目的同一个文件夹下维护，使用起来非常方便，而且当你新建一个文件时，就自动为新文件渲染了对应的模板，都不需要你动手！**

### 关联文件

做网站项目时，我喜欢写一个脚本，就写一个同名的样式文件；而写 node 程序时，写一个脚本，就会写一个同名的测试文件。虽然只是创建一个新文件，没多大成本，但时，可以自动完成的，为什么要去手动做呢？


## vscode 插件 dot-template 如何解决上面三个问题

dot-template 是基于配置文件的，以及一大堆预定义好的模板文件，为了统一管理，需要把配置文件和模板文件一起放在项目根目录下的 `.dtpl` 文件夹内。但时 dot-template 会逐层向上查找 `.dtpl` 文件夹，找到后就匹配配置文件中指定的模板，如果没有匹配成功，就继续向上层文件夹查找 `.dtpl` 文件夹，直至磁盘根目录，最后是用户 HOME 目录。比如当前目录是 `/data/project/xxx`，那么， dot-template 会去下面这些文件夹内找配置文件，并匹配合适的模板：

```
/data/project/xxx/.dtpl
/data/project/.dtpl
/data/.dtpl
/.dtpl
/user/home/Someone/.dtpl
```

### 关于模板文件

dot-template 支持三种模板：`nunjunks`、`ejs`、以及 dot-template 自己的模板 `dtpl`，后缀名分别为 `.njk`，`.ejs`，`.dtpl`。dot-template 会自动根据模板的后缀名来决定使用什么渲染引擎，在复制文件名称的时候，也会自动将这些模板引擎的后缀名去掉。

这里特别要说下 `.dtpl` 的模板，它的变量需要是像 `$name` 这种以 `$` 符号开头的，或者如果要用 `.` 的形式，需要加上大括号，如 `${person.name}`，此模板目前只支持变量替换的功能，没有 `if/for/while` 这些控制语句的功能；但是它有很强的语法提示功能，当你在模板文件内输入 `$` 后， vscode 自动会提示你当前模板所拥有的所有变量，甚至包括你自己定义的模板的局部变量和全局变量（详细的变量可以[参考这里][dtpl-data]）


### 关于配置文件

配置文件需要命名为 `dtpl.js` 或 `dtpl.ts`，用 ts 文件会有很强的语法提示，但有 js 文件会有很强的处理速度，建议用 ts 写，但写完之后就用 `tsc` 编译成 js，或者直接用 `tsc --watch --outFile dtpl.js dtpl.ts` 命令，这样只要你修改了 ts 文件，就自动更新 js 文件。（系统默认只为你生成了 `dtpl.ts` 文件）

配置文件 `dtpl.js` 大概结构是这样的：

```js
module.exports = function(source) {
  return {
    templates: [
      {/* 模板一的配置 */}
      {/* 模板二的配置 */}
      {/*    ...     */}
    ],

    globalData: {
      // 所有模板都可以使用的渲染数据
    }
  }
}
```


> **听上去是不是很烦？**
>
> 别急，既然 dot-template 是一个以模板见长的工具，那么它也为它自己准备好了一套模板！
>
> 你只需要先在 vscode 插件市场里搜索并安装 `dot-template`，然后重启 vscode，然后打开一个项目，在项目根目录创建一个 `.dtpl` 的空文件夹，dot-template 会自动为你生成一个示例的配置文件，还带有一个简易的教程哦！
>
> 还不快去[安装][dtpl-vscode]！


## 在 vscode 之外的其它编辑器使用 dot-template

dot-template 设计的初衷是 vscode 的插件，但在写代码的过程中，我发现其实它并没有太多的依赖 vscode，所以我就把依赖了 vscode 的部分抽离出来了，这样可以很方便的把它移植到其它编辑器中。其它编辑器版本的我没做，只做了一个命令行版本的，项目还是同一个项目（主要是懒，不想把它们放到多个项目中，一个人没精力去维护 [捂脸]），用法如下：

1. 先全局安装 npm 包

  ```bash
  npm install -g dot-template
  ```

2. 安装完后会在你系统里添加 `dtpl` 命令，这时你只要跳到你的带 `.dtpl` 文件夹的目录里，运行

  ```bash
  dtpl watch
  ```

注意：由于监听文件变化的组件 chokidar 在 window 下好像不是很好，所以 window 下用 watch 模式体验并不好。不过 window 用户可以用下面命令来创建文件或文件夹：

```bash
dtpl touch your_file
dtpl mkdir your_dir
```


**接下来，你在项目里新建文件或文件夹，都会像在 vscode 里一样，会自动寻找 `.dtpl` 文件夹下合适的模板**


## dot-template 源码简要概述

![组件的 UML 关系图][uml]

如上图所示，整个项目都已经组件化了。

* 如果你想在其它编辑器中开发一个 dot-template 的插件，只需要继承 `src/core/Editor.ts` 中定义的 Editor 类即可，可以参考 `src/adapter/` 目录下已有的两个 Editor: `VscodeEditor` 和 `CliEditor`
* 如果你有新的 idea，想要创建一个新的命令，可以参考 `src/core/commands/` 文件下的一些已有的命令，相信你很快也可以写出你自己的命令！
* `src/core/Render.tsx` 是模板渲染引擎，所有支持的渲染引擎都在这，如果你也想添加自己的引擎， Give it a try!
* 每个新建的文件，我把它当作 `Source` 类，在 `src/core/file/Source.ts` 文件内，`Source` 类会去 `.dtpl` 文件夹下查找能和它匹配的 `Template` (`src/core/file/Template.ts`) 文件，然后用这个 `Template` 来渲染自己


> 有兴趣的可以直接去 [Github 上查看源码][dtpl]，也欢迎去完成一些[我尚未完成但想去做的功能][dtpl-todo]



<!-- 引用资源  -->
[yeoman]:                     http://yeoman.io/
[vscode-snippet]:             https://code.visualstudio.com/docs/editor/userdefinedsnippets
[vscode-snippet-variables]:   https://code.visualstudio.com/docs/editor/userdefinedsnippets#_variables
[generator-node-babel]:       https://github.com/qiu8310/generator-node-babel
[generator-jquerify]:         https://github.com/qiu8310/generator-jquerify
[generator-nody]:             https://github.com/qiu8310/generator-nody
[dtpl]:                       https://github.com/qiu8310/dot-template
[dtpl-data]:                  https://github.com/qiu8310/dot-template#data
[dtpl-todo]:                  https://github.com/qiu8310/dot-template/blob/master/TODO.md
[dtpl-vscode]:                https://marketplace.visualstudio.com/items?itemName=qiu8310.dot-template
[uml]:                        https://n1image.hjfile.cn/res7/2017/11/05/c3e2b522783ce717103b15dd28d230e3.png
