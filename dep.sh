#!/usr/bin/env bash
set -euo pipefail

: "${REMOTE_HOST:?请通过 REMOTE_HOST 指定部署目标，例如 REMOTE_HOST=jd}"
REMOTE_TMP="${REMOTE_TMP:-/opt/tmpfile}"
REMOTE_SITE="${REMOTE_SITE:-/opt/blog}"

rm -rf ./.vitepress/dist
npm run docs:build

# Non-asset files are deleted by rsync; verify the build retains every live path.
DEPLOY_LOCAL_FILES=$(mktemp)
DEPLOY_REMOTE_FILES=$(mktemp)
DEPLOY_MISSING_FILES=$(mktemp)
trap 'rm -f "$DEPLOY_LOCAL_FILES" "$DEPLOY_REMOTE_FILES" "$DEPLOY_MISSING_FILES"' EXIT
(cd .vitepress/dist && find . -type f ! -path './assets/*' -print | LC_ALL=C sort) > "$DEPLOY_LOCAL_FILES"
ssh "${REMOTE_HOST}" "cd '${REMOTE_SITE}/dist' && find . -type f ! -path './assets/*' -print | LC_ALL=C sort" > "$DEPLOY_REMOTE_FILES"
LC_ALL=C comm -23 "$DEPLOY_REMOTE_FILES" "$DEPLOY_LOCAL_FILES" > "$DEPLOY_MISSING_FILES"
if [ -s "$DEPLOY_MISSING_FILES" ]; then
  echo '部署已停止：以下线上页面或资源未包含在本次构建中：' >&2
  cat "$DEPLOY_MISSING_FILES" >&2
  exit 1
fi
echo '线上非哈希资源保留检查通过。'

cd ./.vitepress/
rm -rf dist.zip
zip -qr dist.zip ./dist/*
scp dist.zip "${REMOTE_HOST}:${REMOTE_TMP}/"

ssh "${REMOTE_HOST}" "REMOTE_TMP='${REMOTE_TMP}' REMOTE_SITE='${REMOTE_SITE}' bash -s" <<'REMOTE_DEPLOY'
set -euo pipefail

DIST_ZIP="${REMOTE_TMP}/dist.zip"
SITE_DIR="${REMOTE_SITE}"
BACKUP_ROOT="${REMOTE_TMP}"
RELEASE_DIR="${BACKUP_ROOT}/blog_release_$(date '+%Y%m%d%H%M%S')"

if [ ! -e "${DIST_ZIP}" ]; then
  echo "dist.zip not exist"
  exit 1
fi

rm -rf "${RELEASE_DIR}"
mkdir -p "${RELEASE_DIR}" "${SITE_DIR}/dist"
unzip -q "${DIST_ZIP}" -d "${RELEASE_DIR}"

if [ -d "${SITE_DIR}/dist" ]; then
  cp -a "${SITE_DIR}/dist" "${BACKUP_ROOT}/$(date '+%Y%m%d%H%M%S')_backup"
fi

# Keep old hashed assets for a few days so clients with cached HTML do not 404
# during or shortly after deployment. Non-asset files are still replaced cleanly.
rsync -a --delete --exclude '/assets/' "${RELEASE_DIR}/dist/" "${SITE_DIR}/dist/"
mkdir -p "${SITE_DIR}/dist/assets"
rsync -a "${RELEASE_DIR}/dist/assets/" "${SITE_DIR}/dist/assets/"

find "${SITE_DIR}/dist/assets" -type f -mtime +7 -delete
find "${SITE_DIR}/dist/assets" -mindepth 1 -type d -empty -delete
find "${BACKUP_ROOT}" -maxdepth 1 -type d -name '*_backup' -mtime +7 -exec rm -rf {} +
rm -rf "${RELEASE_DIR}"
REMOTE_DEPLOY
