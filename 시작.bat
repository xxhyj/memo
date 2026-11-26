@echo off
chcp 65001 >nul
title 메모정리장 서버
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo [!] Node.js 가 설치되어 있지 않아요. https://nodejs.org 에서 설치한 뒤 다시 눌러 주세요.
  echo.
  pause
  exit /b
)

echo.
echo  메모정리장을 시작합니다...
echo  잠시 뒤 브라우저가 자동으로 열려요. (주소: http://localhost:5000)
echo  끄려면 이 창을 닫거나 Ctrl + C 를 누르세요.
echo.

rem 서버가 켜질 시간을 2초 주고 브라우저를 엽니다
start "" /b cmd /c "timeout /t 2 /nobreak >nul && start http://localhost:5000"

node server.js

echo.
echo  서버가 멈췄어요. 이미 다른 창에서 켜져 있다면 그 창을 쓰면 돼요.
pause
