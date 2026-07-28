@echo off
title JARVIS Daemon - Controle Remoto WhatsApp
cd /d "%~dp0"
:loop
node jarvis-daemon.mjs
echo [%date% %time%] Daemon caiu, reiniciando em 15s... >> jarvis-daemon.log
timeout /t 15 /nobreak >nul
goto loop
