#!/bin/bash
# Scripts — 自动化脚本目录
# 存放部署、构建、数据迁移等自动化脚本

# ============================================================
# 快速构建脚本（uni-app 前端项目）
# ============================================================

set -e

PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$PROJECT_ROOT"

echo "==> 开始构建当前项目..."

# （2026-09-22 移除）原先这里探测 :10416 并提示启动 proxy-dev.py——
# 该代理脚本已按维护者要求删除，检查随之摘除。H5 跨域方案待定，别再加回。

# 使用 HBuilderX CLI 构建（如已安装）
# 注意：HBuilderX CLI 路径因安装位置而异
# /Applications/HBuilderX.app/Contents/MacOS/cli uni build --platform h5
# /Applications/HBuilderX.app/Contents/MacOS/cli uni build --platform mp-weixin

echo "==> 构建脚本占位完成。请根据实际环境补充 HBuilderX/CLI 构建命令。"
