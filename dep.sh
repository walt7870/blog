rm -r ./.vitepress/dist 
npm run docs:build
cd ./.vitepress/ \
&& rm -rf dist.zip && zip -r dist.zip ./dist/* \
&& scp dist.zip root@117.72.10.198:/opt/tmpfile/ \
&& ssh root@117.72.10.198 '/root/bin/dep'

