# Learn AI Env Setup

学戏 AI 服务读取顺序：

1. 先读系统环境变量（启动命令所在 shell）
2. 再尝试加载本地文件（若存在）：
   - `.env.local`
   - `.env`
   - `server/.env.local`
   - `server/.env`

推荐配置：

```bash
GLM_API_KEY=your_real_key
GLM_MODEL=glm-4.7-flash
```

兼容兜底（不推荐长期使用）：

```bash
VITE_GLM_API_KEY=your_real_key
VITE_GLM_MODEL=glm-4.7-flash
```

说明：

- `GLM_API_KEY` 优先级最高。
- 健康检查 `/api/health` 会返回 `aiConfigured` 与 `keySource`，用于确认是否已正确读取。
