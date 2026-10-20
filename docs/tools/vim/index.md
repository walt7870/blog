# Vim 编辑器整体指南

Vim 不是一个只靠记快捷键取胜的编辑器。它真正高效的地方在于：把编辑拆成“动作”和“对象”，再用少量命令组合出大量操作。学 Vim 的目标不是背完整命令表，而是形成一种稳定的编辑语言。

这一组文档分成四部分：

- 本文：建立 Vim 的整体认知、常用工作流和学习路线。
- [寄存器](./register.md)：解释复制、删除、粘贴、系统剪贴板和宏。
- [搜索、替换与特殊用法](./special.md)：解释搜索、替换、Vim 正则、文本对象和一些高频特殊命令。
- [插件生态](./plugin.md)：解释 Vim/Neovim 插件体系、常见插件选择和配置维护。

![Vim 的编辑组合与缓冲区关系](/tools/vim-editing-model.svg)

例如把 `order_status = "pending"` 改为 `order_status = "paid"`，光标位于引号内时使用 `ci"paid<Esc>`：`c` 表示修改，`i"` 表示引号内部。它保留两侧引号，并把本次修改记录为可重复动作。下一处相同结构可用 `.`，但先确认光标位于目标字段，避免把不同含义的值一起替换。

下文带普通模式按键的代码块是按键速查，右侧说明不属于按键；不能把整块内容作为 Vimscript 执行。`<Esc>` 表示按 Esc，`Ctrl-r` 表示组合键。只有 `set`、映射等配置才写入 `.vimrc`。

## Vim 的核心思维

### 模式化编辑

Vim 把“输入文字”和“操作文本”分开。大多数时间应该停留在 Normal 模式，需要写字时再短暂进入 Insert 模式。

```vim
Esc        " 回到 Normal 模式
i          " 在光标前插入
a          " 在光标后插入
I          " 到行首插入
A          " 到行尾插入
o          " 在下一行新开一行并插入
O          " 在上一行新开一行并插入
v          " 字符可视模式
V          " 行可视模式
Ctrl-v     " 块可视模式
:          " 命令行模式
```

一个实用习惯：不要在 Insert 模式里用方向键反复移动。输入结束后按 `Esc` 回 Normal 模式，用移动命令定位，再继续编辑。

### 操作符 + 移动

Vim 的命令常常由两段组成：

```text
操作符 + 范围
```

常见操作符：

```vim
d    " delete，删除
c    " change，删除后进入 Insert 模式
y    " yank，复制
g~   " 切换大小写
>    " 增加缩进
<    " 减少缩进
=    " 自动缩进
```

常见范围：

```vim
w    " 到下一个单词开头
e    " 到当前或下一个单词结尾
b    " 到前一个单词开头
0    " 到行首
^    " 到行首第一个非空字符
$    " 到行尾
}    " 到下一段
%    " 到匹配括号；其他结构取决于配置与插件
```

组合以后就变成可读的编辑语言：

```vim
dw      " 删除到下一个单词开头
ciw     " 修改当前单词
y$      " 复制到行尾
d}      " 删除到下一段
>ip     " 缩进当前段落
=G      " 从当前位置格式化到文件末尾
```

### 可重复操作

Vim 鼓励把一次编辑做成“可重复的动作”。

```vim
.       " 重复上一次修改
u       " 撤销
Ctrl-r  " 重做
;       " 重复上一次 f/t/F/T 查找
,       " 反向重复上一次 f/t/F/T 查找
@@      " 重复上一次宏
```

例如，把一个单词改成另一个词时，优先使用 `ciw新词<Esc>`，这样下一个位置按 `.` 就能重复同样的修改。

## 学习路线

### 入门阶段：活下来

先掌握能稳定打开、编辑、保存、退出的命令。

```vim
:w          " 保存
:q          " 退出
:wq         " 保存并退出
:x          " 有修改时保存并退出
:q!         " 放弃修改并退出
:e file     " 打开文件
:w file     " 写入另一文件；当前缓冲区名称通常不变
```

移动只需要先记一组：

```vim
h j k l     " 左、下、上、右
w b e       " 单词移动
0 ^ $       " 行内移动
gg G        " 文件开头、文件末尾
Ctrl-f      " 向下翻页
Ctrl-b      " 向上翻页
```

### 熟练阶段：少按键

开始使用组合命令、文本对象、搜索跳转和寄存器。

```vim
dd          " 删除当前行
yy          " 复制当前行
p           " 在后面粘贴
P           " 在前面粘贴
ciw         " 修改当前单词
ci"         " 修改引号内内容
dap         " 删除当前段落
/word       " 向后搜索 word
n           " 下一个匹配
*           " 搜索光标下单词
```

### 进阶阶段：让编辑可组合

这个阶段关注工作流：

- 用 `:bnext`、`:bprevious`、`:ls` 管理 buffer。
- 用窗口分屏同时查看多个位置。
- 用 mark、jump list、change list 在编辑历史里跳转。
- 用宏处理重复编辑。
- 用插件补足文件查找、Git、LSP、格式化等能力。

## 常用工作流

### 移动与定位

```vim
f,       " 当前行向后找逗号
F,       " 当前行向前找逗号
t)       " 移动到右括号前
H        " 移动到屏幕顶部
M        " 移动到屏幕中间
L        " 移动到屏幕底部
zz       " 当前行居中
zt       " 当前行置顶
zb       " 当前行置底
```

查找比肉眼移动更稳定。已知目标字符时用 `f`/`t`，已知词或模式时用 `/`。

### 编辑文本

```vim
x        " 删除光标下字符
X        " 删除光标前字符
s        " 删除光标下字符并插入
C        " 修改到行尾
D        " 删除到行尾
J        " 合并下一行
rX       " 把光标下字符替换成 X
```

高频修改建议优先用 `c` 开头的命令，因为它会进入 Insert 模式并形成可被 `.` 重复的修改。

```vim
cw       " 光标在非空白词上时通常按 ce，保留词后的空白
ciw      " 修改当前单词
c$       " 修改到行尾
cc       " 修改整行
```

### 复制、删除与粘贴

Vim 的复制粘贴由寄存器支撑。简单使用时只需要：

```vim
yy       " 复制当前行
yap      " 复制当前段落
dd       " 删除当前行
p        " 粘贴到后面
P        " 粘贴到前面
```

如果删除覆盖了刚复制的内容，可以用 `"0p` 粘贴最近一次 yank 的内容。更多细节见 [寄存器](./register.md)。

### 搜索与替换

```vim
/foo             " 向后搜索 foo
?foo             " 向前搜索 foo
n                " 下一个匹配
N                " 上一个匹配
:%s/foo/bar/g    " 全文替换
:%s/foo/bar/gc   " 全文替换并逐个确认
```

搜索、替换和 Vim 正则的细节见 [搜索、替换与特殊用法](./special.md)。

### Buffer、Window、Tab

Vim 里这三个概念容易混淆：

- buffer：已打开的文件内容。
- window：展示某个 buffer 的视图。
- tab：一组 window 的布局。

常用命令：

```vim
:ls             " 查看 buffer 列表
:bnext          " 下一个 buffer
:bprevious      " 上一个 buffer
:buffer 3       " 切到编号为 3 的 buffer
:bdelete        " 关闭当前 buffer

:split          " 水平分屏
:vsplit         " 垂直分屏
Ctrl-w h        " 切到左侧窗口
Ctrl-w j        " 切到下方窗口
Ctrl-w k        " 切到上方窗口
Ctrl-w l        " 切到右侧窗口
Ctrl-w =        " 平均窗口大小

:tabnew         " 新建 tab
:tabedit file   " 在新 tab 打开文件
gt              " 下一个 tab
gT              " 上一个 tab
```

一般建议：用 buffer 管文件，用 window 做临时对照，用 tab 保存不同任务的窗口布局。

### Mark、Jump List 与 Change List

Vim 会记录很多跳转历史，不需要每次都重新找位置。

```vim
ma        " 在当前位置设置局部 mark a
'a        " 跳到 mark a 所在行
`a        " 跳到 mark a 精确位置
:marks    " 查看 marks

Ctrl-o    " 跳回上一个位置
Ctrl-i    " 跳到下一个位置
:jumps    " 查看 jump list

g;        " 跳到上一次修改位置
g,        " 跳到下一次修改位置
```

### 折叠

折叠适合阅读长文件，不适合替代结构化导航。

```vim
zf        " 创建折叠
zo        " 打开折叠
zc        " 关闭折叠
za        " 切换折叠
zR        " 打开所有折叠
zM        " 关闭所有折叠
```

常见折叠方式：

```vim
:set foldmethod=manual
:set foldmethod=indent
:set foldmethod=syntax
:set foldmethod=marker
```

## 推荐基础配置

下面是一份偏保守的 `.vimrc` 起点，适合作为学习 Vim 的基础配置。

```vim
set nocompatible
filetype plugin indent on
syntax enable

set number
set relativenumber
set cursorline
set showcmd
set wildmenu
set hidden

set tabstop=4
set shiftwidth=4
set expandtab
set autoindent

set ignorecase
set smartcase
set incsearch
set hlsearch

set scrolloff=5
set backspace=indent,eol,start
if has('clipboard')
  set clipboard=unnamedplus
endif

let mapleader = ","
nnoremap <leader>w :write<CR>
nnoremap <leader>q :quit<CR>
nnoremap <leader><space> :nohlsearch<CR>
```

`clipboard=unnamedplus` 会让无名寄存器操作使用系统剪贴板，删除也可能覆盖外部复制的内容。Vim 需要编译时支持和可用的桌面剪贴板连接；Neovim 还要检查 provider，SSH 终端本身不自动转发剪贴板。想保留 Vim 内部复制习惯时，可以不设此项，仅显式用 `"+y` 和 `"+p`。

## 一次修改的验收

修改配置文件时先用 `/order_status` 定位，再用文本对象修改一处，检查结果后再重复；不确定时用 `u` 撤销。保存前可在另一窗口查看项目 diff，确认只改变目标字段。批量编辑先在副本或受版本控制的文件中验证，再扩大范围。

buffer 不一定对应磁盘文件，也可能是未命名内容；`:bdelete` 将缓冲区从列表移除，通常不会删除磁盘文件。带未保存修改时普通退出会阻止丢失，遇到提示应先决定保存还是丢弃，不用 `!` 当通用退出方案。

## 使用习惯

- Normal 模式是工作台，Insert 模式只是输入文字的瞬间。
- 优先学习组合规则，而不是孤立背命令。
- 修改尽量做成能被 `.` 重复的动作。
- 搜索比长距离移动更可靠。
- 学会 `:help`，例如 `:help registers`、`:help pattern`、`:help text-objects`。
- 插件是补足工作流，不是学习 Vim 本体的前提。

Vim 的学习曲线确实陡，但一旦理解了“操作符 + 范围 + 可重复”的语言感，它会从一堆难记命令变成一套很稳定的编辑工具。
