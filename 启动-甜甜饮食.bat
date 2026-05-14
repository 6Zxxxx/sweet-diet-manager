@echo off
chcp 65001 >nul
title 甜甜的饮食管理

:: 获取当前脚本所在目录
set "APP_DIR=%~dp0"
set "HTML_PATH=%APP_DIR%src\index.html"

:: 尝试用 Edge 的 App 模式打开（无浏览器边框，像桌面软件）
start msedge --app="file:///%HTML_PATH:\=/%" --window-size=420,820

:: 如果 Edge 不可用，尝试 Chrome
if %errorlevel% neq 0 (
    start chrome --app="file:///%HTML_PATH:\=/%" --window-size=420,820
)

:: 如果都不行，用默认浏览器打开
if %errorlevel% neq 0 (
    start "" "%HTML_PATH%"
)

echo 甜甜的饮食管理 已启动！
pause
