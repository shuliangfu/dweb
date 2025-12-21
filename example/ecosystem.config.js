/**
 * PM2 进程管理配置文件（示例项目）
 * 用于管理 DWeb 应用的生产环境进程
 * 
 * 安装 PM2：
 * npm install -g pm2
 * 
 * 使用方法：
 * pm2 start ecosystem.config.cjs          # 启动应用
 * pm2 stop ecosystem.config.cjs           # 停止应用
 * pm2 restart ecosystem.config.cjs        # 重启应用
 * pm2 reload ecosystem.config.cjs         # 零停机重载
 * pm2 delete ecosystem.config.cjs         # 删除应用
 * pm2 logs                                # 查看日志
 * pm2 status                              # 查看状态
 * pm2 monit                               # 监控面板
 */

module.exports = {
  apps: [
    {
      // 应用名称
      name: "dweb-example",
      
      // 启动脚本（Deno 命令）
      script: "deno",
      
      // 启动参数
      args: "run -A ../src/cli.ts start",
      
      // 工作目录（项目根目录）
      cwd: "./",
      
      // 实例数量（cluster 模式）
      // 设置为 0 或 "max" 表示使用所有 CPU 核心
      instances: 1,
      
      // 执行模式：fork 或 cluster
      // fork: 单进程模式（适合 Deno）
      // cluster: 集群模式（需要 Node.js）
      exec_mode: "fork",
      
      // 自动重启配置
      autorestart: true,
      
      // 监听文件变化并自动重启（开发环境）
      watch: false,
      
      // 忽略监听的文件/目录
      ignore_watch: [
        "node_modules",
        "dist",
        ".git",
        "*.log",
        "*.md",
        "logs"
      ],
      
      // 最大内存限制（超过后自动重启）
      max_memory_restart: "500M",
      
      // 环境变量
      env: {
        NODE_ENV: "production",
        DENO_ENV: "production"
      },
      
      // 开发环境变量（pm2 start ecosystem.config.cjs --env development）
      env_development: {
        NODE_ENV: "development",
        DENO_ENV: "development"
      },
      
      // 日志配置
      // 日志文件路径
      error_file: "./logs/pm2-error.log",
      out_file: "./logs/pm2-out.log",
      
      // 日志文件合并（不按日期分割）
      merge_logs: true,
      
      // 日志时间戳格式
      time: true,
      
      // 日志文件大小限制（超过后自动轮转）
      max_size: "10M",
      
      // 保留的日志文件数量
      retain: 10,
      
      // 日志轮转
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      
      // 进程退出时等待时间（毫秒）
      kill_timeout: 5000,
      
      // 等待就绪信号的时间（毫秒）
      wait_ready: false,
      
      // 监听就绪信号
      listen_timeout: 10000,
      
      // 自动重启延迟（毫秒）
      restart_delay: 4000,
      
      // 最大重启次数（超过后停止重启）
      max_restarts: 10,
      
      // 最小正常运行时间（毫秒，低于此时间重启不计入 max_restarts）
      min_uptime: "10s",
      
      // 退出代码（这些代码不会触发自动重启）
      stop_exit_codes: [0],
      
      // 优雅关闭超时时间（毫秒）
      shutdown_with_message: false
    }
  ]
};

