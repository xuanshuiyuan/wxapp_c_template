#!/bin/bash
# 模板初始化脚本：项目名全局替换 + 可选占位值替换。
# 用法：bash init.sh（在项目根目录执行一次；重复执行前请先确认 git 状态可回滚）
#
# 做三件事：
#   1. 把全仓的 wxapp_c_template 标识（package.json name / manifest name / 本地存储前缀 /
#      README / .claude 文档 / 目录名）替换成新项目名；
#   2. 询问并替换 REPLACE_WX_APPID / REPLACE_API_BASE_URL / REPLACE_OSS_BASE_URL /
#      REPLACE_SERVICE_TEL（回车跳过则保留占位，之后手动 grep 'REPLACE_' 补齐）；
#   3. 打印剩余待办（签名密钥 / 微信业务域名 / 后端联调步骤）。

set -e

old_project_name="wxapp_c_template"

read -p "请输入项目名称（小写字母/数字/下划线，将全局替换 $old_project_name）: " project_name
if [ -z "$project_name" ]; then
  echo "错误: 项目名称不能为空" >&2
  exit 1
fi
if ! echo "$project_name" | grep -qE '^[a-z0-9_]+$'; then
  echo "错误: 项目名称只允许小写字母、数字、下划线（会用于 package.json name 与本地存储前缀）" >&2
  exit 1
fi

read -p "微信小程序 appid（回车跳过，保留 REPLACE_WX_APPID）: " wx_appid
read -p "生产接口域名，如 https://api.example.com（回车跳过）: " api_base
read -p "OSS / CDN 域名，如 https://cdn.example.com（回车跳过）: " oss_base
read -p "客服电话（回车跳过）: " service_tel

# sed -i 兼容 Linux 和 macOS
sedi() {
  if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' "$@"
  else
    sed -i "$@"
  fi
}

# 1. 替换文件内容。
# 文件清单优先取 git ls-files（只碰版本库跟踪的文本文件，node_modules/dist 不会进来）；
# 非 git 环境回落 find，并排除依赖/构建产物与本脚本自身。
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  # 排除 init.sh 自身：替换后 old_project_name 会变成新项目名，
  # 脚本从「模板改名」退化成「重命名当前项目」，重跑时换不动。
  file_list=$(git ls-files | grep -v '^init\.sh$')
else
  file_list=$(find . -type f \
    -not -path "./.git/*" \
    -not -path "./node_modules/*" \
    -not -path "./dist/*" \
    -not -path "./unpackage/*" \
    -not -name "init.sh")
fi
echo "$file_list" | while read -r file; do
  [ -f "$file" ] || continue
  if grep -q "$old_project_name" "$file" 2>/dev/null; then
    sedi "s|$old_project_name|$project_name|g" "$file"
  fi
done

# 2. 重命名包含旧项目名的文件和目录（-depth 保证先处理深层路径）
find . -depth -name "*$old_project_name*" \
  -not -path "./.git/*" -not -path "./node_modules/*" \
  -not -path "./dist/*" -not -path "./unpackage/*" 2>/dev/null | while read -r item; do
  new_item=$(echo "$item" | sed "s|$old_project_name|$project_name|g")
  mv "$item" "$new_item"
done

# 3. 可选占位值替换
if [ -n "$wx_appid" ]; then
  if ! echo "$wx_appid" | grep -qE '^wx[0-9a-zA-Z]{16}$'; then
    echo "⚠️ appid 形态不像微信小程序 appid（wx + 16 位），已按输入写入，请自行复核"
  fi
  sedi "s|REPLACE_WX_APPID|$wx_appid|g" src/manifest.json
fi

if [ -n "$api_base" ]; then
  sedi "s|REPLACE_API_BASE_URL|$api_base|g" .env.production
fi

if [ -n "$oss_base" ]; then
  # utils/oss.js 是 ossHost + 相对路径直接拼接，域名必须带尾斜杠
  case "$oss_base" in
    */) ;;
    *) oss_base="$oss_base/" ;;
  esac
  sedi "s|REPLACE_OSS_BASE_URL|$oss_base|g" .env.production
fi

if [ -n "$service_tel" ]; then
  sedi "s|REPLACE_SERVICE_TEL|$service_tel|g" src/config/app.js
fi

echo ""
echo "============================================================"
echo "初始化完成：$project_name"
echo ""
echo "剩余待办（grep -rn 'REPLACE_' . --exclude-dir=node_modules --exclude-dir=dist）："
echo "  1. src/manifest.json        REPLACE_WX_APPID（若刚才跳过）"
echo "  2. .env.production          REPLACE_API_BASE_URL / REPLACE_OSS_BASE_URL（若刚才跳过）"
echo "  3. src/config/app.js        REPLACE_SERVICE_TEL（若刚才跳过）"
echo "  4. src/config/endpoints.js  REPLACE_UPLOAD_ENDPOINT（后端上传接口路径）"
echo "  5. .env.production.local    VITE_API_KEY（后端线下发放，绝不进 git）"
echo "  6. 微信后台 → 开发管理 → 业务域名：配置 web-view 预览域名"
echo ""
echo "联调："
echo "  npm install"
echo "  npm run dev:mp-weixin     # 开发者工具导入 dist/dev/mp-weixin"
echo "  npm run dev:h5            # http://localhost:5173（/v2 已代理到 127.0.0.1:15000）"
echo "============================================================"