@echo off
setlocal
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-windows.ps1"
if errorlevel 1 (
  echo.
  echo Startup failed. Press any key to close...
  pause >nul
)
