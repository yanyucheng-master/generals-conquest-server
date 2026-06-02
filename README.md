# 《将领：征服》Generals Conquest

完整游戏源码（Vite + React）与联机 WebSocket 服务。

## 仓库结构

```
├── src/              前端游戏逻辑与界面
├── public/           静态资源
├── server/           联机服（Render 部署目录）
│   ├── index.cjs
│   ├── package.json
│   └── render.yaml
├── scripts/          卡牌数据导出等工具脚本
├── package.json      前端依赖与构建
└── .env.example      环境变量示例
```

## 本地开发

```bash
npm install
npm run dev
```

联机本地测试：运行 `start-local.bat` 或另开终端 `cd server && npm install && npm start`。

## 部署

| 平台 | 用途 | 设置 |
|------|------|------|
| **Render** | 联机服 | Root Directory: `server`，Build: `npm install`，Start: `npm start` |
| **Netlify** | 前端网页 | Build: `npm run build`，Publish: `dist` |
| 环境变量 | 前端连联机 | `VITE_WS_URL=wss://你的服务.onrender.com` |

当前线上地址（参考）：

- 前端：https://general-conquest.netlify.app
- 联机：wss://yyc-generals-conquest-server-ws.onrender.com

## 说明

- 勿提交 `node_modules`、`dist`、`.env.production`。
- 若 Render 此前使用仓库**根目录**的 `index.cjs`，请改 Root Directory 为 **`server`** 后重新部署。
