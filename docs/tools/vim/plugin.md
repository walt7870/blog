# Vim 插件生态

Vim 可以只靠内置功能完成大量编辑任务，但现代开发通常还需要文件查找、Git、LSP、补全、格式化、主题等能力。插件的价值不是把 Vim 变成另一个 IDE，而是补齐你的工作流。

本文以 Vim 为主，同时说明 Neovim 生态的差异。目标是帮你知道该选哪类插件、怎么管理配置、如何排查问题。

## 插件体系概览

### Vim 内置 packages

Vim 8 以后内置 packages 机制，不装插件管理器也能加载插件。

典型目录：

```text
~/.vim/pack/vendor/start/plugin-name
~/.vim/pack/vendor/opt/plugin-name
```

- `start`：启动时自动加载。
- `opt`：按需加载，需要 `:packadd plugin-name`。

优点是简单、官方内置、依赖少；缺点是更新、锁版本、延迟加载等能力需要自己维护。

### vim-plug

vim-plug 是 Vim 里常见的插件管理器，配置简单，支持并行安装和按需加载。

安装：

```bash
curl -fLo ~/.vim/autoload/plug.vim --create-dirs \
  https://raw.githubusercontent.com/junegunn/vim-plug/master/plug.vim
```

基础配置：

```vim
call plug#begin('~/.vim/plugged')

Plug 'tpope/vim-surround'
Plug 'tpope/vim-commentary'
Plug 'junegunn/fzf', { 'do': { -> fzf#install() } }
Plug 'junegunn/fzf.vim'

call plug#end()
```

常用命令：

```vim
:PlugInstall     " 安装插件
:PlugUpdate      " 更新插件
:PlugClean       " 清理未使用插件
:PlugStatus      " 查看状态
:PlugUpgrade     " 更新 vim-plug 自身
```

按需加载示例：

```vim
Plug 'preservim/nerdtree', { 'on': 'NERDTreeToggle' }
Plug 'junegunn/goyo.vim', { 'for': 'markdown' }
```

### Vundle 与 Pathogen

Vundle 和 Pathogen 是更早期的插件管理方式。

- Pathogen 主要解决 runtimepath 管理问题，插件更新通常依赖手动 Git 操作。
- Vundle 提供安装和更新命令，但生态活跃度和现代能力不如 vim-plug。

新配置通常不建议从它们开始。维护老配置时，理解它们即可。

### Neovim 与 lazy.nvim

Neovim 的主流配置语言是 Lua，插件生态里 lazy.nvim 很常见，支持懒加载、依赖管理、锁文件和模块化配置。

极简示例：

```lua
require("lazy").setup({
  { "tpope/vim-surround" },
  { "tpope/vim-commentary" },
  { "nvim-telescope/telescope.nvim", dependencies = { "nvim-lua/plenary.nvim" } },
})
```

如果你主要使用 Vimscript 和传统 Vim，vim-plug 更直接；如果你使用 Neovim 并愿意用 Lua 组织配置，lazy.nvim 更贴近当前 Neovim 生态。

## 按功能选择插件

### 文件查找与项目搜索

推荐方向：

- `junegunn/fzf.vim`：轻量、快，依赖 fzf，可配合 ripgrep。
- Neovim 用户也常用 `telescope.nvim`。

vim-plug 示例：

```vim
Plug 'junegunn/fzf', { 'do': { -> fzf#install() } }
Plug 'junegunn/fzf.vim'
```

常用命令：

```vim
:Files       " 查找文件
:Buffers     " 查找 buffer
:Rg          " 使用 ripgrep 搜索内容
:History     " 查找历史文件
```

常用映射：

```vim
nnoremap <leader>f :Files<CR>
nnoremap <leader>b :Buffers<CR>
nnoremap <leader>g :Rg<CR>
```

### Git 集成

推荐方向：

- `tpope/vim-fugitive`：Git 命令集成，适合 status、diff、blame、commit。
- `airblade/vim-gitgutter`：在符号列显示行级变更。

```vim
Plug 'tpope/vim-fugitive'
Plug 'airblade/vim-gitgutter'
```

常用命令：

```vim
:Git status
:Git blame
:Gdiffsplit
```

常用映射：

```vim
nmap ]h <Plug>(GitGutterNextHunk)
nmap [h <Plug>(GitGutterPrevHunk)
nmap <leader>hs <Plug>(GitGutterStageHunk)
nmap <leader>hu <Plug>(GitGutterUndoHunk)
```

### LSP、补全与诊断

Vim 里常见选择：

- `neoclide/coc.nvim`：体验接近 VS Code 扩展生态，配置相对集中。
- `dense-analysis/ale`：异步 lint 和格式化，也可配合 LSP。

Neovim 里常见选择：

- 内置 LSP 客户端。
- `nvim-cmp` 做补全。
- `mason.nvim` 管理语言服务器。

coc.nvim 示例：

```vim
Plug 'neoclide/coc.nvim', {'branch': 'release'}
```

安装语言扩展：

```vim
:CocInstall coc-json coc-tsserver coc-pyright coc-go
```

### 格式化

推荐原则：优先使用项目已有格式化工具，例如 Prettier、black、gofmt、rustfmt，而不是让 Vim 插件重新定义格式规则。

常见方式：

- 使用 coc.nvim / ALE 调用格式化器。
- 前端项目使用 Prettier。
- 保存时按文件类型触发格式化。

简单示例，把 Go 文件的格式化命令交给 `gq`：

```vim
augroup FormatTools
  autocmd!
  autocmd FileType go setlocal formatprg=gofmt
augroup END

nnoremap <leader>= gggqG
```

实际项目中更推荐交给 LSP 或专门插件，避免手写过多自动命令。

### 注释、括号与文本对象

这些插件小而稳定，适合很早加入配置：

```vim
Plug 'tpope/vim-commentary'
Plug 'tpope/vim-surround'
Plug 'jiangmiao/auto-pairs'
```

常用操作：

```vim
gcc       " 注释或取消注释当前行
gc        " 可视模式下注释选区
cs"'      " 把双引号改成单引号
ds"       " 删除双引号
ysiw"     " 给当前单词加双引号
```

### 状态栏与主题

状态栏：

- `vim-airline/vim-airline`：功能完整。
- `itchyny/lightline.vim`：轻量灵活。

主题：

- `morhetz/gruvbox`
- `dracula/vim`
- `joshdick/onedark.vim`
- `arcticicestudio/nord-vim`

配置示例：

```vim
Plug 'vim-airline/vim-airline'
Plug 'vim-airline/vim-airline-themes'
Plug 'morhetz/gruvbox'

set termguicolors
set background=dark
colorscheme gruvbox
let g:airline_theme = 'gruvbox'
```

主题是个人偏好，不建议为了外观引入太多互相影响的插件。

### 文件树

文件树不是 Vim 的必需品，因为 buffer 和模糊查找通常更高效。但如果你需要项目结构视图，可以使用：

```vim
Plug 'preservim/nerdtree'
```

```vim
nnoremap <leader>n :NERDTreeToggle<CR>
nnoremap <leader>r :NERDTreeFind<CR>
let NERDTreeShowHidden = 1
```

如果已经习惯 `:Files` / `:Rg`，文件树可以作为辅助，而不是主要入口。

## 一份可用的 `.vimrc`

### 基础设置

```vim
set nocompatible
filetype plugin indent on
syntax enable

set number
set relativenumber
set cursorline
set hidden
set showcmd
set wildmenu

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
set updatetime=300

if has('clipboard')
  set clipboard=unnamedplus
endif

let mapleader = ","
nnoremap <leader>w :write<CR>
nnoremap <leader>q :quit<CR>
nnoremap <leader><space> :nohlsearch<CR>
```

### 插件配置

```vim
call plug#begin('~/.vim/plugged')

Plug 'junegunn/fzf', { 'do': { -> fzf#install() } }
Plug 'junegunn/fzf.vim'

Plug 'tpope/vim-fugitive'
Plug 'airblade/vim-gitgutter'

Plug 'tpope/vim-surround'
Plug 'tpope/vim-commentary'

Plug 'neoclide/coc.nvim', {'branch': 'release'}

Plug 'vim-airline/vim-airline'
Plug 'vim-airline/vim-airline-themes'
Plug 'morhetz/gruvbox'

call plug#end()
```

### 快捷键与外观

```vim
nnoremap <leader>f :Files<CR>
nnoremap <leader>b :Buffers<CR>
nnoremap <leader>g :Rg<CR>

nmap ]h <Plug>(GitGutterNextHunk)
nmap [h <Plug>(GitGutterPrevHunk)
nmap <leader>hs <Plug>(GitGutterStageHunk)
nmap <leader>hu <Plug>(GitGutterUndoHunk)

if has('termguicolors')
  set termguicolors
endif

set background=dark
silent! colorscheme gruvbox
let g:airline_theme = 'gruvbox'
```

这份配置不是“全家桶”，而是一个可维护起点。后续每加一个插件，都应该能说清它解决了哪个问题。

## 配置组织

当 `.vimrc` 变长后，可以拆成多个文件：

```vim
source ~/.vim/config/basic.vim
source ~/.vim/config/plugins.vim
source ~/.vim/config/mappings.vim
source ~/.vim/config/autocmds.vim
```

建议用 Git 管理配置：

```bash
cd ~
git init
git add .vimrc .vim
git commit -m "Initial vim config"
```

如果需要跨机器同步，可以把配置放进 dotfiles 仓库。

## 性能与排错

### 查看启动耗时

```bash
vim --startuptime startup.log
```

打开后查看耗时较高的插件或脚本。

也可以用 Vim 内置 profile：

```vim
:profile start profile.log
:profile func *
:profile file *
" 执行一些慢操作
:profile pause
:noautocmd qall!
```

### 检查插件状态

```vim
:PlugStatus
:scriptnames
:messages
:echo &runtimepath
```

### 排查快捷键冲突

```vim
:map <leader>f
:nmap <leader>f
:verbose nmap <leader>f
```

`:verbose map` 会显示映射来自哪个脚本，对排查插件覆盖很有用。

### 临时禁用插件

```bash
vim --noplugin
```

如果禁用插件后问题消失，再逐个注释插件定位原因。

### 常见问题

- 插件安装后命令不存在：确认执行过 `:PlugInstall`，并检查 `:PlugStatus`。
- 主题不生效：确认插件已安装，`colorscheme` 写在 `call plug#end()` 之后。
- 图标乱码：通常需要 Nerd Font，或者不要启用图标插件。
- 补全很慢：先确认语言服务器是否正常，再检查项目规模和诊断配置。
- 剪贴板无效：执行 `:version`，确认是否有 `+clipboard`。

## 选择原则

- 先熟悉 Vim 内置能力，再用插件补齐明确缺口。
- 插件按功能选，不按热度堆。
- 每个插件都要有清晰入口、快捷键和退出方案。
- 优先使用项目已有工具链，例如 formatter、linter、language server。
- 遇到问题先查 `:messages`、`:scriptnames`、`:verbose map`。
- 配置应该能被你自己解释，不能解释的配置迟早会变成维护成本。

插件生态很丰富，但好的 Vim 配置通常很克制。把最常用的路径打磨顺，比安装更多插件更重要。
