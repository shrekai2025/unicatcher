## PM2 使用说明（UniCatcher）

### PM2 是什么
PM2 是 Node.js 的进程管理器，用于在服务器上常驻运行应用、崩溃自动拉起、统一日志、开机自启、在线热更新与监控。

### 核心概念
- 应用（app）：由 PM2 管理的一个进程（或一组进程）。
- 模式（mode）：
  - fork：单进程（推荐大多数场景）。
  - cluster：多实例集群（需应用是无状态 HTTP 服务）。
- 进程文件（ecosystem）：PM2 的应用声明文件，建议使用 `ecosystem.config.cjs`。

### 项目内推荐配置示例
```js
// ecosystem.config.cjs
module.exports = {
  apps: [{
    name: 'unicatcher',
    script: 'npm',
    args: 'start',
    cwd: '/home/ubuntu/unicatcher',
    exec_mode: 'fork',            // 避免 cluster 带来的端口/状态问题
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: { NODE_ENV: 'production', PORT: 3067, DISPLAY: ':100' },
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    error_file: './logs/unicatcher-error.log',
    out_file: './logs/unicatcher-out.log',
    log_file: './logs/unicatcher-combined.log'
  }]
}
```

### 常用命令（最常用）
- 启动/重启/停止/删除
  - `pm2 start ecosystem.config.cjs`
  - `pm2 restart unicatcher`
  - `pm2 stop unicatcher`
  - `pm2 delete unicatcher`
- 状态与详情
  - `pm2 status`
  - `pm2 describe unicatcher`
  - `pm2 env <id>` 显示某进程环境变量
- 日志与监控
  - `pm2 logs unicatcher`（实时日志，Ctrl+C 退出）
  - `pm2 logs unicatcher --lines 200`（最近 200 行）
  - `pm2 monit`（交互式 CPU/内存监控）
  - `pm2 flush unicatcher`（清空日志）

### 开机自启与配置持久化
- `pm2 startup` 生成 systemd 自启指令，按提示执行一次（或使用 `pm2 startup systemd -u ubuntu --hp /home/ubuntu`）。
- `pm2 save` 将当前进程列表保存到 `~/.pm2/dump.pm2`，用于开机恢复（resurrect）。
- `pm2 resurrect` 手动从保存的列表恢复。
- `pm2 unstartup` 取消自启。

提示：`pm2 save` 的作用是“快照当前受管的应用列表”，配合 `startup` 实现服务器重启后自动拉起同样的应用集。

### 其他有用命令
- 升级 PM2 本体：`pm2 updatePM2`
- 平滑重载（无中断，HTTP 服务适用）：`pm2 reload unicatcher`
- 列出所有应用列表：`pm2 list`
- 杀掉 PM2 守护进程（不常用）：`pm2 kill`

### 日志位置
- 默认：`~/.pm2/logs/*.log`
- 本项目已定制：`unicatcher/logs/unicatcher-*.log`

### 典型排错流程
1) 看状态：`pm2 status`
2) 看日志：`pm2 logs unicatcher --lines 200`
3) 构建/初始化：`npm install && npm run build && npm run safe-init-db`
4) 端口检查：`ss -tlnp | grep :3067 || netstat -tlnp | grep :3067`
5) 重启应用：`pm2 restart unicatcher`

### 与其它爬虫的隔离建议
- 使用不同端口（如 3067/9223）。
- 使用不同 DISPLAY（如 `:99` 与 `:100`）。
- 独立日志目录与用户数据目录。

### 一键初始化与启动（参考）
```bash
mkdir -p logs
npm install
npm run build
npm run safe-init-db
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup   # 按提示执行一次生成的命令
```

以上命令足够覆盖日常“更新/启动/停止/日志/自启/恢复”等运维需求。

