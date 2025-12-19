#!/bin/bash
# 运行测试并生成覆盖率报告
# 过滤掉测试 fixtures 相关的错误信息

set -e

# 运行测试并收集覆盖率数据
deno test --allow-all --no-check --coverage=coverage tests/ 2>&1 | grep -v 'Error generating coverage report' || true

# 生成覆盖率报告，忽略测试 fixtures，并过滤错误信息
deno coverage coverage --ignore='tests/fixtures/.*' --exclude='tests/fixtures/.*' 2>&1 | grep -v 'Error generating coverage report' || true

