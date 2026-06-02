@echo off
chcp 65001 >nul
title 《将领：征服》本地开发
echo ==========================================
echo   《将领：征服》本地启动（前端 + 联机服）
echo ==========================================
echo.

node --version >nul 2>&1
if errorlevel 1 (
    echo [错误] 未检测到 Node.js，请先安装 https://nodejs.org/
    pause
    exit /b 1
)

cd /d "%~dp0"

if not exist "node_modules" (
    echo [1/3] 安装前端依赖...
    call npm install
) else (
    echo [1/3] 前端依赖已就绪
)

echo [2/3] 启动联机服务器 (ws://localhost:3001)...
start "将领征服-联机服" cmd /k "node server\index.cjs"

echo [3/3] 启动前端 (http://localhost:3000)...
echo.
echo 浏览器打开: http://localhost:3000
echo 联机测试: 先启动联机服后，主菜单 -^> 联机对战
echo.
npm run dev
