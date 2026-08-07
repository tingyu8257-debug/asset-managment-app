@echo off
cd /d "%~dp0"
title Core-Satellite Local Server
echo Starting Core-Satellite at http://localhost:3000
echo Keep this window open while using the website.
echo Press Ctrl+C to stop the server.
echo.
"C:\Program Files\nodejs\node.exe" server.js
echo.
echo The server has stopped.
pause
