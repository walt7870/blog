# Vim 编辑器使用指南

Vim 是一个功能强大的模式化文本编辑器，以其高效的编辑能力和丰富的功能而闻名。本指南按常规操作和高阶操作分类介绍 Vim 的核心功能。

## 常规操作

### 模式系统

Vim 的核心特性是模式化编辑，主要包含四种模式：

#### Normal 模式（默认模式）
用于导航、删除、复制等操作，是 Vim 的默认模式。

```
Esc            # 从任何模式返回 Normal 模式
h, j, k, l     # 左、下、上、右移动
w, b, e        # 单词间移动（下一个词首、上一个词首、词尾）
0, ^, $        # 行首、行首非空字符、行尾
gg, G          # 文件开头、文件结尾
Ctrl+f/b       # 向下/向上翻页
```

#### Insert 模式
用于插入和编辑文本内容。

```
i              # 光标前插入
I              # 行首插入
a              # 光标后插入
A              # 行尾插入
o              # 下方新建行并插入
O              # 上方新建行并插入
```

#### Visual 模式
用于选择文本进行批量操作。

```
v              # 字符选择模式
V              # 行选择模式
Ctrl+v         # 块选择模式
gv             # 重新选择上次的选择区域
```

#### Command 模式
用于执行复杂命令和配置。

```
:              # 进入命令模式
:w             # 保存文件
:q             # 退出
:wq, :x, ZZ    # 保存并退出
:q!            # 强制退出不保存
```

### 基本编辑操作

#### 删除操作
```
x              # 删除光标下字符
X              # 删除光标前字符
dd             # 删除整行
dw             # 删除单词
d$, D          # 删除到行尾
d0             # 删除到行首
```

#### 复制粘贴操作
```
yy             # 复制整行
yw             # 复制单词
y$             # 复制到行尾
p              # 在光标后粘贴
P              # 在光标前粘贴
```

#### 撤销重做
```
u              # 撤销
Ctrl+r         # 重做
.              # 重复上一个操作
```

### 搜索和替换

#### 搜索
```
/pattern       # 向下搜索
?pattern       # 向上搜索
n              # 下一个匹配
N              # 上一个匹配
*              # 搜索光标下的单词（向下）
#              # 搜索光标下的单词（向上）
```

#### 替换
```
:s/old/new/        # 替换当前行第一个匹配
:s/old/new/g       # 替换当前行所有匹配
:%s/old/new/g      # 替换全文所有匹配
:%s/old/new/gc     # 替换全文所有匹配（逐个确认）
```

### 文件和缓冲区管理

#### 文件操作
```
:e filename    # 打开文件
:w filename    # 另存为
:r filename    # 读取文件内容到当前位置
```

#### 缓冲区操作
```
:ls            # 列出所有缓冲区
:bn            # 下一个缓冲区
:bp            # 上一个缓冲区
:b number      # 切换到指定缓冲区
:bd            # 关闭当前缓冲区
```

### 视图管理

#### 窗口分割
```
:split, :sp    # 水平分割窗口
:vsplit, :vs   # 垂直分割窗口
Ctrl+w h/j/k/l # 在窗口间移动
Ctrl+w +/-     # 调整窗口大小
Ctrl+w =       # 均分窗口大小
Ctrl+w c       # 关闭当前窗口
```

#### 标签页
```
:tabnew        # 新建标签页
:tabedit file  # 在新标签页中打开文件
gt, :tabnext   # 下一个标签页
gT, :tabprev   # 上一个标签页
:tabclose      # 关闭当前标签页
```

## 高阶操作

### 寄存器系统

Vim 提供了强大的寄存器系统用于存储文本。

#### 寄存器类型
```
""             # 默认寄存器
"0-"9          # 数字寄存器（自动存储删除和复制的内容）
"a-"z          # 命名寄存器（用户自定义）
"A-"Z          # 大写命名寄存器（追加模式）
"+             # 系统剪贴板寄存器
"*             # 选择缓冲区寄存器
"/             # 搜索寄存器
":             # 命令寄存器
```

#### 寄存器操作
```
"ayy           # 复制当前行到寄存器 a
"ap            # 粘贴寄存器 a 的内容
"+y            # 复制到系统剪贴板
"+p            # 从系统剪贴板粘贴
:reg           # 查看所有寄存器内容
:reg a         # 查看寄存器 a 的内容
```

### 宏录制和执行

宏是 Vim 中自动化重复操作的强大工具。

```
qa             # 开始录制宏到寄存器 a
q              # 停止录制
@a             # 执行宏 a
@@             # 重复执行上一个宏
10@a           # 执行宏 a 十次
:reg a         # 查看宏 a 的内容
```

### 文本对象

文本对象是 Vim 中用于精确选择和操作文本的概念。

#### 文本对象操作符
```
c              # 改变（删除并进入插入模式）
d              # 删除
y              # 复制
v              # 选择
```

#### 文本对象范围
```
iw             # 单词内部
aw             # 整个单词（包括空格）
i", a"         # 引号内部/整个引号区域
i(, a(         # 括号内部/整个括号区域
i[, a[         # 方括号内部/整个方括号区域
i{, a{         # 花括号内部/整个花括号区域
it, at         # 标签内部/整个标签区域
ip, ap         # 段落内部/整个段落
is, as         # 句子内部/整个句子
```

#### 使用示例
```
ciw            # 改变单词内容
ca"            # 改变包括引号的内容
di(            # 删除括号内内容
yap            # 复制整个段落
```

### 正则表达式和高级搜索

#### 正则表达式元字符
```
.              # 匹配任意字符
*              # 前一个字符零次或多次
+              # 前一个字符一次或多次
?              # 前一个字符零次或一次
^              # 行首
$              # 行尾
\<, \>         # 单词边界
\d             # 数字
\w             # 单词字符
\s             # 空白字符
\D, \W, \S     # 对应的反向匹配
```

#### 高级搜索技巧
```
/\v            # 开启 very magic 模式
/\c            # 忽略大小写搜索
/\C            # 区分大小写搜索
/pattern\zs    # 匹配开始位置
/pattern\ze    # 匹配结束位置
```

### 书签和跳转

#### 书签操作
```
ma             # 设置书签 a（局部书签）
mA             # 设置书签 A（全局书签）
'a             # 跳转到书签 a 的行首
`a             # 跳转到书签 a 的精确位置
:marks         # 查看所有书签
:delmarks a    # 删除书签 a
```

#### 跳转列表
```
Ctrl+o         # 跳转到上一个位置
Ctrl+i         # 跳转到下一个位置
:jumps         # 查看跳转列表
```

### 代码折叠

#### 折叠操作
```
zf             # 创建折叠
zo             # 打开折叠
zc             # 关闭折叠
za             # 切换折叠状态
zR             # 打开所有折叠
zM             # 关闭所有折叠
zd             # 删除折叠
```

#### 折叠方法
```
:set foldmethod=manual    # 手动折叠
:set foldmethod=indent    # 基于缩进折叠
:set foldmethod=syntax    # 基于语法折叠
:set foldmethod=marker    # 基于标记折叠
```

### 插件系统

#### 插件管理器
现代 Vim 使用插件管理器来安装和管理插件：

- **vim-plug**：轻量级插件管理器
- **Vundle**：经典插件管理器
- **Pathogen**：简单的插件管理

#### 常用插件类别

**文件管理**
- NERDTree：文件树浏览器
- CtrlP/fzf：模糊文件查找

**代码编辑**
- YouCompleteMe/coc.nvim：代码补全
- Syntastic/ALE：语法检查
- vim-surround：快速编辑包围字符

**界面美化**
- vim-airline：状态栏美化
- vim-colorschemes：颜色主题集合

**Git 集成**
- vim-fugitive：Git 操作集成
- vim-gitgutter：显示 Git 差异

### 配置和定制

#### 基本配置 (~/.vimrc)
```vim
" 基础设置
set number relativenumber    " 显示行号和相对行号
set tabstop=4 shiftwidth=4   " 设置缩进
set expandtab                " 用空格替代 Tab
set autoindent smartindent   " 智能缩进
set hlsearch incsearch       " 搜索高亮和增量搜索
set ignorecase smartcase     " 智能大小写匹配
set wildmenu                 " 命令行补全
set laststatus=2             " 显示状态栏
syntax on                    " 语法高亮

" 键映射
let mapleader = ","          " 设置 Leader 键
nnoremap <leader>w :w<CR>    " 快速保存
inoremap jj <Esc>            " 快速退出插入模式
```

#### 高级配置技巧
```vim
" 自动命令
autocmd BufWritePre * :%s/\s\+$//e  " 保存时删除行尾空格
autocmd FileType python setlocal ts=4 sw=4 et  " Python 文件特定设置

" 函数定义
function! ToggleNumber()
    if &number
        set nonumber norelativenumber
    else
        set number relativenumber
    endif
endfunction

" 条件配置
if has('gui_running')
    set guifont=Monaco:h14
endif
```

---

掌握这些常规和高阶操作，将让你能够充分发挥 Vim 的强大功能，大幅提升文本编辑效率。