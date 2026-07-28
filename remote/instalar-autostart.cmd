@echo off
REM Instala o JARVIS Daemon pra iniciar junto com o Windows (no logon do usuário).
REM Rodar UMA vez, com dois cliques ou pelo terminal.
schtasks /create /tn "JARVIS Daemon" /tr "\"%~dp0jarvis-daemon.cmd\"" /sc onlogon /rl limited /f
if %errorlevel%==0 (
  echo.
  echo OK! O JARVIS Daemon vai iniciar sozinho quando voce fizer logon.
  echo Pra iniciar AGORA sem reiniciar: schtasks /run /tn "JARVIS Daemon"
) else (
  echo.
  echo Falhou. Tente rodar este arquivo como administrador.
)
pause
