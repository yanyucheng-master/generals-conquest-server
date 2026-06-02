@echo off
chcp 65001 >nul
title 《将领：征服》服务器一键部署
echo ==========================================
echo   《将领：征服》联机服务器一键部署工具
echo   目标平台: Railway.app（免费，国内可访问）
echo ==========================================
echo.

REM 检查node
node --version >nul 2>&1
if errorlevel 1 (
    echo [错误] 未检测到 Node.js
    echo 请先安装: https://nodejs.org/ （选 LTS 版本）
    pause
    exit /b 1
)

REM 检查npm
npm --version >nul 2>&1
if errorlevel 1 (
    echo [错误] npm 不可用
    pause
    exit /b 1
)

echo [1/6] 创建工作目录...
set DEPLOY_DIR=%USERPROFILE%\generals-deploy
if not exist "%DEPLOY_DIR%" mkdir "%DEPLOY_DIR%"
cd /d "%DEPLOY_DIR%"

echo [2/6] 下载服务器文件...
powershell -Command "Invoke-WebRequest -Uri 'https://fpzzgomqfxnya.ok.kimi.link/server/index.cjs' -OutFile 'index.cjs' -UseBasicParsing" 2>nul
if not exist "index.cjs" (
    echo       尝试备用下载方式...
    curl -sL -o index.cjs https://fpzzgomqfxnya.ok.kimi.link/server/index.cjs
)
powershell -Command "Invoke-WebRequest -Uri 'https://fpzzgomqfxnya.ok.kimi.link/server/package.json' -OutFile 'package.json' -UseBasicParsing" 2>nul
if not exist "package.json" (
    curl -sL -o package.json https://fpzzgomqfxnya.ok.kimi.link/server/package.json
)

echo [3/6] 安装 Railway CLI...
npm install -g @railway/cli
if errorlevel 1 (
    echo [警告] 全局安装失败，尝试本地安装...
    npm init -y
    npm install @railway/cli
    set RAILWAY_CMD=npx railway
) else (
    set RAILWAY_CMD=railway
)

echo.
echo [4/6] 登录 Railway...
echo ==========================================
echo 即将弹出浏览器，请用邮箱或GitHub登录 Railway
echo （免费的，不需要信用卡）
echo ==========================================
pause
%RAILWAY_CMD% login

echo.
echo [5/6] 创建项目...
%RAILWAY_CMD% init --name generals-conquest

echo [6/6] 部署服务器...
%RAILWAY_CMD% up

echo.
echo ==========================================
echo        部署完成！
echo ==========================================
echo.
echo 正在获取服务器地址...
%RAILWAY_CMD% domain > railway_domain.txt 2>nul
set /p DOMAIN=<railway_domain.txt 2>nul

if defined DOMAIN (
    echo.
    echo 你的服务器地址:
    echo.
    echo   HTTP:  https://%DOMAIN%
    echo   WebSocket: wss://%DOMAIN%
    echo.
    echo 请复制下面这个地址到游戏的"服务器配置"中:
    echo.
    echo   wss://%DOMAIN%
    echo.
    echo 把地址保存到文件: server_url.txt
echo wss://%DOMAIN%> server_url.txt
) else (
    echo 请运行以下命令查看地址:
    echo   railway domain
)

echo.
echo 按任意键退出...
pause >nul
