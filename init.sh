#!/bin/bash
# 模板初始化脚本：项目名/显示名全局替换 + 可选占位值替换 + 后端端口同步。
# 用法：bash init.sh（在项目根目录执行一次；重复执行前请先确认 git 状态可回滚）
#
# 做四件事：
#   1. 把全仓的 wxapp_c_template 标识（package.json name / manifest name / 本地存储前缀 /
#      README / .claude 文档 / 目录名）替换成新项目名；
#   2. 把显示名 `C 端小程序模板` 替换成新项目对外名称（H5 标题 / pages.json / manifest / 首页）；
#   3. 询问并替换 REPLACE_WX_APPID / REPLACE_API_BASE_URL / REPLACE_OSS_BASE_URL /
#      REPLACE_SERVICE_TEL / REPLACE_UPLOAD_ENDPOINT（回车跳过则保留占位，之后手动 grep 'REPLACE_' 补齐）；
#   4. 同步后端端口（.env.development / vite.config.js）并打印剩余待办。

set -e

old_project_name="wxapp_c_template"
old_display_name="C 端小程序模板"
default_backend_port=15000

read -p "请输入项目名称（小写字母/数字/下划线，将全局替换 $old_project_name）: " project_name
if [ -z "$project_name" ]; then
  echo "错误: 项目名称不能为空" >&2
  exit 1
fi
if ! echo "$project_name" | grep -qE '^[a-z0-9_]+$'; then
  echo "错误: 项目名称只允许小写字母、数字、下划线（会用于 package.json name 与本地存储前缀）" >&2
  exit 1
fi

read -p "项目显示名（用于标题/描述，回车默认 $project_name）: " display_name
display_name=${display_name:-$project_name}

read -p "后端本地端口（回车默认 $default_backend_port）: " backend_port
backend_port=${backend_port:-$default_backend_port}
if ! echo "$backend_port" | grep -qE '^[0-9]+$' || [ "$backend_port" -lt 1 ] || [ "$backend_port" -gt 65535 ]; then
  echo "错误: 端口必须是 1~65535 的数字" >&2
  exit 1
fi

read -p "微信小程序 appid（回车跳过，保留 REPLACE_WX_APPID）: " wx_appid
read -p "生产接口域名，如 https://api.example.com（回车跳过）: " api_base
read -p "OSS / CDN 域名，如 https://cdn.example.com（回车跳过）: " oss_base
read -p "客服电话（回车跳过）: " service_tel
read -p "上传接口路径，如 web/common/upload（回车跳过）: " upload_endpoint

# sed -i 兼容 Linux 和 macOS
sedi() {
  if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' "$@"
  else
    sed -i "$@"
  fi
}

# sed 替换串转义：显示名可能含 & / |，不转义会被 sed 当特殊字符展开
sed_escape() {
  printf '%s' "$1" | sed 's/[&|\\]/\\&/g'
}

# 域名补协议：用户常只填 api.example.com；没有 scheme 的地址在小程序端不是合法 URL
normalize_base_url() {
  local value="$1"
  [ -z "$value" ] && return 0
  case "$value" in
    http://*|https://*) ;;
    *) value="https://$value" ;;
  esac
  printf '%s' "$value"
}

api_base=$(normalize_base_url "$api_base")
oss_base=$(normalize_base_url "$oss_base")
if [ -n "$oss_base" ]; then
  case "$oss_base" in
    */) ;;
    *) oss_base="$oss_base/" ;;
  esac
fi

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
  # -I：只处理文本文件，避免二进制恰好命中标识被 sed 改写损坏
  if grep -Iq "$old_project_name" "$file" 2>/dev/null; then
    sedi "s|$old_project_name|$(sed_escape "$project_name")|g" "$file"
  fi
done

# 2. 显示名替换（只改对外文案文件，避免把 README 里的通用描述也换掉）
display_files=(
  "index.html"
  "src/pages.json"
  "src/manifest.json"
  "package.json"
  "src/pages/home/index.vue"
)
for file in "${display_files[@]}"; do
  [ -f "$file" ] || continue
  if grep -Iq "$old_display_name" "$file" 2>/dev/null; then
    sedi "s|$old_display_name|$(sed_escape "$display_name")|g" "$file"
  fi
done

# 3. 重命名包含旧项目名的文件和目录（-depth 保证先处理深层路径）
find . -depth -name "*$old_project_name*" \
  -not -path "./.git/*" -not -path "./node_modules/*" \
  -not -path "./dist/*" -not -path "./unpackage/*" 2>/dev/null | while read -r item; do
  new_item=$(echo "$item" | sed "s|$old_project_name|$project_name|g")
  mv "$item" "$new_item"
done

# 4. 后端端口同步（开发环境 host + Vite 代理；manifest 的 devServer 只保留端口，不再重复代理）
sedi "s|127\.0\.0\.1:$default_backend_port|127.0.0.1:$backend_port|g" .env.development
sedi "s|127\.0\.0\.1:$default_backend_port|127.0.0.1:$backend_port|g" vite.config.js

# 5. 可选占位值替换
if [ -n "$wx_appid" ]; then
  if ! echo "$wx_appid" | grep -qE '^wx[0-9a-fA-Z]{16}$'; then
    echo "⚠️ appid 形态不像微信小程序 appid（wx + 16 位），已按输入写入，请自行复核"
  fi
  sedi "s|REPLACE_WX_APPID|$(sed_escape "$wx_appid")|g" src/manifest.json
fi

if [ -n "$api_base" ]; then
  sedi "s|REPLACE_API_BASE_URL|$(sed_escape "$api_base")|g" .env.production
fi

if [ -n "$oss_base" ]; then
  sedi "s|REPLACE_OSS_BASE_URL|$(sed_escape "$oss_base")|g" .env.production
fi

if [ -n "$service_tel" ]; then
  sedi "s|REPLACE_SERVICE_TEL|$(sed_escape "$service_tel")|g" src/config/app.js
fi

if [ -n "$upload_endpoint" ]; then
  sedi "s|REPLACE_UPLOAD_ENDPOINT|$(sed_escape "$upload_endpoint")|g" src/config/endpoints.js
fi

echo ""
echo "============================================================"
echo "初始化完成：$project_name（显示名：$display_name，后端端口：$backend_port）"
echo ""
echo "剩余待办（grep -rn 'REPLACE_' . --exclude-dir=node_modules --exclude-dir=dist）："
echo "  1. src/manifest.json        REPLACE_WX_APPID（若刚才跳过）"
echo "  2. .env.production          REPLACE_API_BASE_URL / REPLACE_OSS_BASE_URL（若刚才跳过）"
echo "  3. src/config/app.js        REPLACE_SERVICE_TEL（若刚才跳过）"
echo "  4. src/config/endpoints.js  REPLACE_UPLOAD_ENDPOINT（后端上传接口路径）"
echo "  5. .env.production.local    VITE_API_KEY（后端线下发放，绝不进 git）"
echo "     示例：printf 'VITE_API_KEY=你的密钥\\n' > .env.production.local"
echo "  6. 微信后台 → 开发管理 → 业务域名：配置 web-view 预览域名"
echo "  7. 替换 tabbar 图标（src/static/tabbar/）与 loading 图（src/static/loading.png）"
echo ""
echo "联调："
echo "  npm install"
echo "  npm run dev:mp-weixin     # 开发者工具导入 dist/dev/mp-weixin；真机需把 host 改成 LAN IP"
echo "  npm run dev:h5            # http://localhost:5173（/v2 已代理到 127.0.0.1:$backend_port）"
echo "============================================================"