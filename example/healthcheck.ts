// 健康检查脚本
// 使用简单的 fetch，不导入任何外部依赖
try {
  const res = await fetch('http://localhost:3000', {
    signal: AbortSignal.timeout(5000), // 5秒超时
  });
  Deno.exit(res.ok ? 0 : 1);
} catch (_error) {
  Deno.exit(1);
}

