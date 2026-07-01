@echo off
REM Lancador do ambiente de teste (Windows).
REM Executa o script PowerShell ignorando a politica de execucao, sem alterar
REM nenhuma configuracao permanente do sistema.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0iniciar-teste.ps1"
echo.
pause
