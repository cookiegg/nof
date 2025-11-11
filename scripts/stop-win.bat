@echo off
setlocal

echo [nof] Stopping backend/frontend dev servers ...
REM Kill node processes matching server.js or next dev
powershell -NoProfile -Command "Get-CimInstance Win32_Process ^| Where-Object { ($_.Name -eq 'node.exe') -and ( ($_.CommandLine -match 'src/server.js') -or ($_.CommandLine -match 'next dev') ) } ^| ForEach-Object { try { Stop-Process -Id $_.ProcessId -Force -ErrorAction Stop } catch {} }"

echo [nof] Done. Check ports 3000/3001 if still occupied.

endlocal


