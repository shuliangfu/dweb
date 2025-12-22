#!/bin/bash
# 启动 pup 进程管理器（后台运行）

cd "$(dirname "$0")"

# 使用方法1：直接后台运行
# pup run &

# 使用方法2：使用 nohup（推荐，关闭终端后仍运行）
nohup pup run > pup.log 2>&1 &

echo "✅ pup 进程已在后台启动"
echo "📋 查看日志: tail -f pup.log"
echo "📊 查看状态: pup status"
echo "🛑 停止进程: pup terminate"

