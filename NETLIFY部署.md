# 《将领：征服》Netlify 部署指南

Netlify 只部署**游戏网页（前端）**。公网联机还需要 Render 上的 WebSocket 服（见文末）。

| 项目 | 地址 |
|------|------|
| 线上前端 | https://general-conquest.netlify.app |
| 联机服 | `wss://yyc-generals-conquest-server-ws.onrender.com` |
| GitHub | https://github.com/yanyucheng-master/generals-conquest-server |

---

## 方式一：Git 自动部署（推荐）

改代码 push 到 GitHub 后，Netlify 自动构建发布。

### 首次配置

1. 登录 [Netlify](https://app.netlify.com) → **Add new site** → **Import an existing project**
2. 连接 GitHub 仓库 `yanyucheng-master/generals-conquest-server`
3. 构建设置（仓库根目录即 `app/`，一般会自动识别 `netlify.toml`）：

   | 项 | 值 |
   |---|---|
   | Build command | `npm run build` |
   | Publish directory | `dist` |
   | Node version | 20（已在 `netlify.toml` 中配置） |

4. **环境变量**（Site configuration → Environment variables → Add variable）：

   ```
   Key:   VITE_WS_URL
   Value: wss://yyc-generals-conquest-server-ws.onrender.com
   ```

   > Vite 在**构建时**注入该变量，改地址后需重新 Deploy。

5. Deploy site，等待构建完成。

### 日常更新

```powershell
cd app
# 改完 src/ 后
..\push-github.ps1
# Netlify 自动触发构建；也可在 Netlify 控制台 Manual deploy
```

---

## 方式二：本地打包 + 拖拽上传

不连 Git、或想本地验证后再上传时使用。

### 步骤

```powershell
cd app

# 1. 确保联机地址（本地文件，勿提交 Git）
#    复制 .env.example → .env.production，填入：
#    VITE_WS_URL=wss://yyc-generals-conquest-server-ws.onrender.com

# 2. 构建并同步到 netlify-upload/
npm run pack:netlify

# 3. 上传
#    打开 https://app.netlify.com → 你的站点 → Deploys
#    将 netlify-upload 文件夹拖入 Drag and drop 区域
```

`pack:netlify` = `npm run build` + 把 `dist/` 复制到 `netlify-upload/`（保留其中的 `上传说明.txt`）。

### 上传内容

```
netlify-upload/
  index.html
  assets/
    index-*.js
    index-*.css
```

只需上传 **`index.html` + `assets/`** 即可（不要只传说明文件）。

---

## 方式三：Netlify CLI

```powershell
cd app
npm install
npx netlify login
npx netlify link          # 或 netlify init 创建新站点

# 预览部署
npx netlify deploy --build

# 生产部署（需先在 Netlify 控制台设置 VITE_WS_URL）
npx netlify deploy --prod --build
```

---

## 环境变量说明

| 变量 | 必填 | 说明 |
|------|------|------|
| `VITE_WS_URL` | 公网联机必填 | Render 联机服 WebSocket 地址，须以 `wss://` 开头 |

- **Git 部署**：在 Netlify 控制台设置，不要提交 `.env.production`。
- **本地拖拽**：写在 `app/.env.production`，构建时 Vite 会读入。

未设置 `VITE_WS_URL` 时，线上页面仍可打开，但「公网联机」无法连到 Render。

---

## 验证清单

1. 打开 https://general-conquest.netlify.app（或预览 URL）
2. 主菜单 → **联机对战** → **公网联机**
3. 创建房间，另一设备/浏览器加入
4. 若连接失败：检查 `VITE_WS_URL`、Render 服务是否在线（免费版冷启动约 15–30 秒）

---

## 与 Render 的关系

```
玩家浏览器  →  Netlify（静态网页 + 游戏逻辑）
     ↓ WebSocket
Render 联机服（房间、同步、断线重连）
```

- 只更新 Netlify：UI 变了，联机逻辑可能仍是旧服
- 只更新 Render：前端可能仍连旧地址
- **联机相关改动**：建议 Netlify + Render 一起更新

Render 设置见项目根 `部署指南.txt` 第二节。

---

## 常见问题

**构建失败 `tsc` 报错**  
本地先 `npm run build` 修完 TypeScript 错误再 push。

**页面空白 / 资源 404**  
确认 Publish directory 是 `dist`，不是 `netlify-upload`（Git 部署）或仓库根目录。

**改了联机地址不生效**  
Git 部署：改 Netlify 环境变量后 **Trigger deploy**。本地拖拽：改 `.env.production` 后重新 `npm run pack:netlify`。

**免费 Render 休眠**  
首次联机前等十几秒；或升级 Render 付费计划。
