@echo off
REM ============================================================
REM  Iniciar rapido - Sistema de Medicoes DER/PR (uso diario)
REM  NAO instala nada. So liga o banco e sobe backend e frontend.
REM  Use o iniciar-teste.cmd apenas apos trocar arquivos/dependencias.
REM ============================================================
cd /d "%~dp0"
echo Ligando o banco de dados...
docker start medicao-db >nul 2>&1
echo Subindo backend (porta 3000) e frontend (porta 5173)...
start "Backend - Medicoes" cmd /k npm run dev
start "Frontend - Medicoes" cmd /k "cd frontend && npm run dev"
echo Aguardando os servidores...
timeout /t 6 >nul
start http://localhost:5173
echo.
echo Pronto. Acesse http://localhost:5173
echo Para parar: feche as duas janelas (Backend e Frontend).
echo.
