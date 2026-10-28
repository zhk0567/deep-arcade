@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"
set "FATFISH_NODE="
for /f "delims=" %%N in ('where node.exe 2^>nul') do if not defined FATFISH_NODE set "FATFISH_NODE=%%N"
if not defined FATFISH_NODE if exist "%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" set "FATFISH_NODE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
if not defined FATFISH_NODE (
  echo 没有找到 Node.js。请安装 Node.js 18 或更新版本，或打开“离线试玩.cmd”。
  pause
  exit /b 1
)
echo 合成大肥鱼 v0.6.8：正在启动游戏和排行榜后台。
echo 请保留此窗口；关闭窗口会停止本次启动的后台。
"%FATFISH_NODE%" "%~dp0launcher.cjs"
if errorlevel 1 pause