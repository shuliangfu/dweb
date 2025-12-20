#!/bin/bash

# DWeb Docker 升级脚本
# 用于快速升级 Docker 部署的应用

set -e

echo "🚀 开始升级 DWeb 应用..."

# 检查是否在项目根目录
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ 错误: 请在项目根目录执行此脚本"
    exit 1
fi

# 检查 Docker 是否运行
if ! docker info > /dev/null 2>&1; then
    echo "❌ 错误: Docker 未运行，请先启动 Docker"
    exit 1
fi

# 显示当前容器状态
echo ""
echo "📊 当前容器状态:"
docker compose ps

# 确认是否继续
echo ""
read -p "是否继续升级? (y/N): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ 升级已取消"
    exit 0
fi

# 停止旧容器并重新构建
echo ""
echo "🔨 正在重新构建镜像..."
docker compose up -d --build

# 等待容器启动
echo ""
echo "⏳ 等待容器启动..."
sleep 5

# 检查容器状态
echo ""
echo "📊 升级后容器状态:"
docker compose ps

# 检查健康状态
echo ""
echo "🏥 检查健康状态..."
if docker inspect dweb-example > /dev/null 2>&1; then
    HEALTH=$(docker inspect --format='{{.State.Health.Status}}' dweb-example 2>/dev/null || echo "no-healthcheck")
    if [ "$HEALTH" = "healthy" ]; then
        echo "✅ 容器健康检查通过"
    elif [ "$HEALTH" = "no-healthcheck" ]; then
        echo "⚠️  容器未配置健康检查"
    else
        echo "⚠️  容器健康状态: $HEALTH"
    fi
fi

# 显示日志
echo ""
echo "📋 最近日志 (最后 20 行):"
docker compose logs --tail=20

echo ""
echo "✅ 升级完成！"
echo ""
echo "💡 提示:"
echo "  - 查看完整日志: docker compose logs -f"
echo "  - 访问应用: http://localhost:3000"
echo "  - 检查状态: docker compose ps"

