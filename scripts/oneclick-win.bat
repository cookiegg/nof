@echo off
setlocal ENABLEDELAYEDEXPANSION

REM Detect project root (this script's parent directory)
set SCRIPT_DIR=%~dp0
for %%I in ("%SCRIPT_DIR%..") do set ROOT_DIR=%%~fI
cd /D "%ROOT_DIR%"

echo [nof] Project root: %ROOT_DIR%

REM 1) Check Node.js
where node >nul 2>nul
if errorlevel 1 (
  echo [nof] Node.js not found. Please install Node.js LTS (https://nodejs.org/) then re-run this script.
  goto :END
)

REM 2) Create config.json if missing
if not exist "%ROOT_DIR%\config.json" (
  echo [nof] Creating example config.json ...
  powershell -NoProfile -Command ^
    "$json = @{ env = @{ ^
      NEXT_PUBLIC_URL='http://localhost:3000'; ^
      DASHSCOPE_API_KEY_1='sk-xxx'; ^
      HTTPS_PROXY=''; HTTP_PROXY=''; NO_PROXY='localhost,127.0.0.1'; ^
      TRADING_ENV='demo-futures'; ^
      BINANCE_API_KEY_DEMO_FUTURES=''; BINANCE_API_SECRET_DEMO_FUTURES=''; BINANCE_DEMO='true'; BINANCE_DEMO_FUTURES_BASE_URL='https://demo-fapi.binance.com'; ^
      BINANCE_API_KEY_TEST_SPOT=''; BINANCE_API_SECRET_TEST_SPOT=''; BINANCE_TEST='true' ^
    } }; ^
    $json | ConvertTo-Json -Depth 5 | Set-Content -Encoding UTF8 '%ROOT_DIR%\config.json'"
)

REM 3) Install dependencies
echo [nof] Installing backend deps ...
pushd "%ROOT_DIR%\backend"
call npm install
popd

echo [nof] Installing web deps ...
pushd "%ROOT_DIR%\web"
call npm install
popd

REM 4) Start backend and frontend (background windows)
set LOGDIR=%TEMP%
echo [nof] Starting backend (http://localhost:3001)...
start "nof-backend" cmd /c "cd /D %ROOT_DIR%\backend && npm run dev 1>%LOGDIR%\nof-backend.log 2>&1"

echo [nof] Starting frontend (http://localhost:3000)...
start "nof-web" cmd /c "cd /D %ROOT_DIR%\web && npm run dev 1>%LOGDIR%\nof-web.log 2>&1"

echo [nof] Logs: %LOGDIR%\nof-backend.log and %LOGDIR%\nof-web.log
echo [nof] Open http://localhost:3000

:END
endlocal


