---
Author: Walt
Date: 2022-09-29 21:14:36
title: 
LastEditTime: 2022-09-29 21:34:16
LastEditors: Walt
---
grep:
-c 统计行数
-n 显示行号
-o 不显示非关键词
-E 增强

? 0次或一次
+ 一次或多次
| 或者
（）分组
g(oo|la)d
grep -E 'l+' 
l一次货多次



[^0-5]  配置0-5之外的数据



找出所有的空行
^$  -》 空行
grep '^$' file
找出#开头的行
grep '^#' file

找出以.结尾的行
grep '\.$' file

