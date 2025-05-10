#!/bin/bash
CERT_PATH=/Users/niu/Downloads/cert.zip
CERT_REMOTE_PATH=/usr/local/openresty/nginx/conf/cert/
HOST_IP=117.72.10.198


scp $CERT_PATH root@${HOST_IP}:$CERT_REMOTE_PATH \
&& ssh root@${HOST_IP} "/usr/local/openresty/nginx/conf/cert/rep.sh"
