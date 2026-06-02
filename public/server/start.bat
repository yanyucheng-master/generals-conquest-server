@echo off
chcp 65001 >nul
title 《将领：征服》联机服务器
echo ==========================================
echo   《将领：征服》联机对战服务器启动器
echo ==========================================
echo.

REM 检查node
node --version >nul 2>&1
if errorlevel 1 (
    echo [错误] 未检测到 Node.js，请先安装 Node.js
    echo 下载地址: https://nodejs.org/
    pause
    exit /b 1
)

echo [1/2] 检查依赖...
if not exist "node_modules" (
    echo       正在安装 ws 模块...
    npm install ws
) else (
    echo       依赖已安装
)

echo.
echo [2/2] 启动服务器...
echo.
node index.cjs

echo.
echo 服务器已停止
pause
