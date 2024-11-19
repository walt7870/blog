---
title: vim.md
author: Walt
date: 2022-07-03 15:00:29
---
\v 可以开启之后的特殊字符都有特殊含义（#特殊）
\V 开启字符原含义


## 特殊字符
```
\x 字符类代替 [0-9A-Fa-f]
\w 匹配单词类字符，包括字母、数字以及符号"_"
\W 对\w取反
/\v<(\w+)\_s+\1>
< 与 > 两符号将用于匹配单词的边界
\_s 会匹配空白符或换行符

\v(And|D)rew Neil
\v%(And|D)rew Neil 不会将括号内的内容传递给子模式

\zs 标志着一个匹配的起始
\ze 则用来界定匹配的结束
example:

/\v"[^"]+"<CR> Match "quoted words"---not quote marks.

/\v"\zs[^"]+\ze"<CR> Match "quoted words"---not quote marks.

替换名和姓
/\v(%(And|D)rew) (Neil)
%s//\2, \1/g

example
AndrewNeil

Search items: [http://vimdoc.net/search?q=/\\][s] 
... 
[s]: http://vimdoc.net/search?q=/\\

escape(@u,getcmdtype().'\')

```
