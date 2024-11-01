rm -r ./.vitepress/dist 
###
 # @Author: Wancheng Wancheng@ideamake.cn
 # @Date: 2024-11-01 11:41:00
 # @LastEditors: Wancheng Wancheng@ideamake.cn
 # @LastEditTime: 2024-11-01 16:09:59
 # @FilePath: /vite/.vitepress/dep.sh
 # @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
### 
npm run docs:build
cd ./.vitepress/ \
&& rm -rf dist.zip && zip -r dist.zip ./dist/* \
&& scp dist.zip root@117.72.10.198:/opt/tmpfile/ \
&& ssh root@117.72.10.198 '/root/bin/dep'

